import type {
  AggregateAxisCoverage,
  AggregatedDataCfg,
  AggregatedSubTotalRecord,
  FieldName,
  MeasureField,
  PivotDimensionValue,
  PivotRecord,
} from '../types/data-cfg'
import { normalizeMeasures } from '../types/data-cfg'
import type { HierarchyType } from '../types/options'
import type { LayoutNodeKind } from '../types/layout'
import { createDimTree, pathKey, type DimNode, type DimTree } from './dim-tree'

export type TaggedValue =
  | ['null']
  | ['string', string]
  | ['number', number]
  | ['boolean', boolean]

export type AxisCoordKey = string

type AxisKind = 'detail' | 'subtotal' | 'grandTotal'

interface InternalAxisRef {
  kind: AxisKind
  /** Dimension values along the axis (empty for grandTotal) */
  path: Array<{ field: FieldName; value: PivotDimensionValue }>
  /** Present when kind === 'subtotal' */
  subTotalOn?: FieldName
}

export interface ServerCellStore {
  /** `${rowNodeId}|${colNodeId}|${measure}` -> value */
  cells: Map<string, unknown>
  /** nodeId -> axis coordinate key used when ingesting */
  nodeCoords: Map<number, AxisCoordKey>
  version: number
}

export class AggregatedContractError extends Error {
  constructor(message: string) {
    super(`[vue-pivot] aggregated contract: ${message}`)
    this.name = 'AggregatedContractError'
  }
}

export function tagValue(value: PivotDimensionValue): TaggedValue {
  if (value === null) return ['null']
  if (typeof value === 'string') return ['string', value]
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new AggregatedContractError(`non-finite number dimension value: ${value}`)
    }
    return ['number', value]
  }
  if (typeof value === 'boolean') return ['boolean', value]
  throw new AggregatedContractError(`invalid dimension value type: ${typeof value}`)
}

function assertDimValue(value: unknown, ctx: string): asserts value is PivotDimensionValue {
  if (value === null) return
  const t = typeof value
  if (t === 'string' || t === 'boolean') return
  if (t === 'number' && Number.isFinite(value as number)) return
  throw new AggregatedContractError(`${ctx}: dimension values must be finite JSON scalars, got ${String(value)}`)
}

export function axisCoordKey(ref: InternalAxisRef): AxisCoordKey {
  const pathPart = ref.path.map((seg) => [seg.field, tagValue(seg.value)])
  const extra = ref.kind === 'subtotal' ? (ref.subTotalOn ?? null) : null
  return JSON.stringify([ref.kind, pathPart, extra])
}

export function makeServerCellKey(rowNodeId: number, colNodeId: number, measure: string): string {
  return `${rowNodeId}|${colNodeId}|${measure}`
}

function hasOwn(record: PivotRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, field)
}

function displayValue(value: PivotDimensionValue): string {
  if (value === null) return '(null)'
  return String(value)
}

/** Path token that preserves JS type so 1 and "1" do not collide in pathIndex */
function typedPathToken(value: PivotDimensionValue): string {
  const tagged = tagValue(value)
  if (tagged[0] === 'null') return '\u0002n'
  if (tagged[0] === 'string') return `\u0002s:${tagged[1]}`
  if (tagged[0] === 'number') return `\u0002d:${tagged[1]}`
  return `\u0002b:${tagged[1] ? '1' : '0'}`
}

const SUBTOTAL_TOKEN = '\u0002sub'
const GRAND_TOTAL_TOKEN = '\u0002grand'

function fieldPresence(record: PivotRecord, fields: FieldName[]): 'all' | 'none' | 'partial' {
  if (fields.length === 0) return 'all'
  let present = 0
  for (const f of fields) {
    if (hasOwn(record, f)) present++
  }
  if (present === 0) return 'none'
  if (present === fields.length) return 'all'
  return 'partial'
}

function readDetailPath(record: PivotRecord, fields: FieldName[], ctx: string): InternalAxisRef {
  const presence = fieldPresence(record, fields)
  if (presence !== 'all') {
    throw new AggregatedContractError(`${ctx}: leaf requires all axis fields present (${fields.join(', ')})`)
  }
  const path = fields.map((field) => {
    const value = record[field]
    assertDimValue(value, `${ctx}.${field}`)
    return { field, value }
  })
  return { kind: 'detail', path }
}

function readGrandTotalAxis(
  record: PivotRecord,
  fields: FieldName[],
  coverage: AggregateAxisCoverage | undefined,
  ctx: string,
): InternalAxisRef {
  const presence = fieldPresence(record, fields)
  if (presence === 'partial') {
    throw new AggregatedContractError(`${ctx}: totals axis must be all-present or all-absent`)
  }
  if (presence === 'none') {
    if (!coverage?.grandTotal) {
      throw new AggregatedContractError(`${ctx}: grandTotal not declared in aggregate.totals`)
    }
    return { kind: 'grandTotal', path: [] }
  }
  return readDetailPath(record, fields, ctx)
}

function readSubTotalAxis(
  record: AggregatedSubTotalRecord,
  fields: FieldName[],
  coverage: AggregateAxisCoverage | undefined,
  ctx: string,
): InternalAxisRef {
  const on = record.subTotalOn
  if (!on) throw new AggregatedContractError(`${ctx}: subTotalOn is required`)
  const allowed = coverage?.subTotals ?? []
  if (!allowed.includes(on)) {
    throw new AggregatedContractError(`${ctx}: subTotalOn "${on}" not declared in aggregate.totals`)
  }
  const atIndex = fields.indexOf(on)
  if (atIndex < 0) {
    throw new AggregatedContractError(`${ctx}: subTotalOn "${on}" is not on axis`)
  }

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!
    const owned = hasOwn(record, field)
    if (i < atIndex) {
      if (!owned) {
        throw new AggregatedContractError(`${ctx}: missing prefix field "${field}" before subTotalOn`)
      }
    } else if (owned) {
      throw new AggregatedContractError(
        `${ctx}: field "${field}" must be omitted for subtotal at "${on}"`,
      )
    }
  }

  const path = fields.slice(0, atIndex).map((field) => {
    const value = record[field]
    assertDimValue(value, `${ctx}.${field}`)
    return { field, value }
  })
  return { kind: 'subtotal', path, subTotalOn: on }
}

function ensureDimChild(
  tree: DimTree,
  parentId: number,
  field: string,
  value: string,
  label: string,
  kind: LayoutNodeKind,
  coordKey: string,
  nodeCoords: Map<number, AxisCoordKey>,
  memberMeta: Map<string, { label: string }>,
): DimNode {
  const parent = tree.nodes.get(parentId)!
  const nextPath = [...parent.path, value]
  const key = pathKey(nextPath)
  const existingId = tree.pathIndex.get(key)
  if (existingId != null) {
    const existing = tree.nodes.get(existingId)!
    const prev = memberMeta.get(key)
    if (prev && label !== prev.label) {
      throw new AggregatedContractError(`inconsistent label for path ${key}: "${prev.label}" vs "${label}"`)
    }
    nodeCoords.set(existing.id, coordKey)
    return existing
  }

  const id = tree.nextId++
  const node: DimNode = {
    id,
    value,
    label,
    field,
    depth: parent.depth + 1,
    parentId,
    children: [],
    isLeaf: true,
    kind,
    expanded: false,
    path: nextPath,
  }
  parent.children.push(id)
  parent.isLeaf = false
  tree.nodes.set(id, node)
  tree.pathIndex.set(key, id)
  nodeCoords.set(id, coordKey)
  memberMeta.set(key, { label })
  return node
}

function ensureAxisNodes(
  tree: DimTree,
  ref: InternalAxisRef,
  axisFields: FieldName[],
  coordKey: AxisCoordKey,
  nodeCoords: Map<number, AxisCoordKey>,
  memberMeta: Map<string, { label: string }>,
  totalLabel: string,
  subTotalLabel: string,
): number {
  if (ref.kind === 'grandTotal') {
    const node = ensureDimChild(
      tree,
      tree.rootId,
      '__grand_total__',
      GRAND_TOTAL_TOKEN,
      totalLabel,
      'grandTotal',
      coordKey,
      nodeCoords,
      memberMeta,
    )
    return node.id
  }

  if (axisFields.length === 0 && ref.kind === 'detail' && ref.path.length === 0) {
    const node = ensureDimChild(
      tree,
      tree.rootId,
      '__empty_axis__',
      '\u0002empty',
      '',
      'dimension',
      coordKey,
      nodeCoords,
      memberMeta,
    )
    return node.id
  }

  let parentId = tree.rootId
  for (let i = 0; i < ref.path.length; i++) {
    const seg = ref.path[i]!
    const isLast = i === ref.path.length - 1
    const node = ensureDimChild(
      tree,
      parentId,
      seg.field,
      typedPathToken(seg.value),
      displayValue(seg.value),
      'dimension',
      isLast && ref.kind !== 'subtotal'
        ? coordKey
        : axisCoordKey({ kind: 'detail', path: ref.path.slice(0, i + 1) }),
      nodeCoords,
      memberMeta,
    )
    parentId = node.id
  }

  if (ref.kind === 'subtotal') {
    const on = ref.subTotalOn!
    const node = ensureDimChild(
      tree,
      parentId,
      on,
      `${SUBTOTAL_TOKEN}:${on}`,
      subTotalLabel,
      'subTotal',
      coordKey,
      nodeCoords,
      memberMeta,
    )
    return node.id
  }

  nodeCoords.set(parentId, coordKey)
  return parentId
}

function applyExpandState(tree: DimTree, expandDepth: number, expandedPaths: string[][]): void {
  for (const node of tree.nodes.values()) {
    if (node.id === tree.rootId) {
      node.expanded = true
      continue
    }
    node.expanded = node.depth < expandDepth
  }
  for (const path of expandedPaths) {
    const id = tree.pathIndex.get(pathKey(path))
    if (id == null) continue
    let cur: DimNode | undefined = tree.nodes.get(id)
    while (cur) {
      cur.expanded = true
      cur = cur.parentId == null ? undefined : tree.nodes.get(cur.parentId)
    }
  }
}

function ingestCell(
  store: ServerCellStore,
  seenCells: Set<string>,
  rowTree: DimTree,
  colTree: DimTree,
  rowRef: InternalAxisRef,
  colRef: InternalAxisRef,
  record: PivotRecord,
  measureFields: string[],
  rowFields: FieldName[],
  colFields: FieldName[],
  rowMemberMeta: Map<string, { label: string }>,
  colMemberMeta: Map<string, { label: string }>,
  totalLabel: string,
  subTotalLabel: string,
  ctx: string,
): void {
  const rowKey = axisCoordKey(rowRef)
  const colKey = axisCoordKey(colRef)
  const dupKey = `${rowKey}\0${colKey}`
  if (seenCells.has(dupKey)) {
    throw new AggregatedContractError(`${ctx}: duplicate cell coordinates`)
  }
  seenCells.add(dupKey)

  const rowNodeId = ensureAxisNodes(
    rowTree,
    rowRef,
    rowFields,
    rowKey,
    store.nodeCoords,
    rowMemberMeta,
    totalLabel,
    subTotalLabel,
  )
  const colNodeId = ensureAxisNodes(
    colTree,
    colRef,
    colFields,
    colKey,
    store.nodeCoords,
    colMemberMeta,
    totalLabel,
    subTotalLabel,
  )

  for (const measure of measureFields) {
    if (!(measure in record)) continue
    store.cells.set(makeServerCellKey(rowNodeId, colNodeId, measure), record[measure])
  }
}

export interface BuildAggregatedResultOptions {
  dataCfg: AggregatedDataCfg
  hierarchyType: HierarchyType
  expandDepth: number
  expandedRowPaths: string[][]
  expandedColPaths: string[][]
}

export interface AggregatedBuildResult {
  rowTree: DimTree
  colTree: DimTree
  serverCells: ServerCellStore
  measures: MeasureField[]
  records: PivotRecord[]
}

export function createServerCellStore(): ServerCellStore {
  return {
    cells: new Map(),
    nodeCoords: new Map(),
    version: 1,
  }
}

export function getServerCellValue(
  store: ServerCellStore,
  rowNodeId: number,
  colNodeId: number,
  measure: string,
): unknown {
  const key = makeServerCellKey(rowNodeId, colNodeId, measure)
  if (!store.cells.has(key)) return null
  return store.cells.get(key)
}

/**
 * Validate aggregated leaf/subtotal/total records, build dim trees, index cells by node ids.
 * Never calls aggregators.
 */
export function buildAggregatedResult(options: BuildAggregatedResultOptions): AggregatedBuildResult {
  const { dataCfg } = options
  if (dataCfg.aggregate.shape !== 'wide') {
    throw new AggregatedContractError(`unsupported aggregate.shape: ${dataCfg.aggregate.shape}`)
  }
  if ('preAggregated' in dataCfg && (dataCfg as { preAggregated?: unknown }).preAggregated) {
    throw new AggregatedContractError('preAggregated is not allowed when dataKind is aggregated')
  }

  const rowFields = dataCfg.fields.rows ?? []
  const colFields = dataCfg.fields.columns ?? []
  const measures = normalizeMeasures(dataCfg.fields.values ?? [])
  const measureFields = measures.map((m) => m.field)
  const totalLabel = dataCfg.totalLabel ?? 'Total'
  const subTotalLabel = dataCfg.subTotalLabel ?? 'Subtotal'
  const rowCoverage = dataCfg.aggregate.totals?.row
  const colCoverage = dataCfg.aggregate.totals?.column

  const rowTree = createDimTree()
  const colTree = createDimTree()
  const store = createServerCellStore()
  const rowMemberMeta = new Map<string, { label: string }>()
  const colMemberMeta = new Map<string, { label: string }>()
  const seenCells = new Set<string>()

  const leaves = dataCfg.data ?? []
  for (let i = 0; i < leaves.length; i++) {
    const record = leaves[i]!
    const ctx = `data[${i}]`
    const rowRef = readDetailPath(record, rowFields, `${ctx}.row`)
    const colRef = readDetailPath(record, colFields, `${ctx}.column`)
    ingestCell(
      store,
      seenCells,
      rowTree,
      colTree,
      rowRef,
      colRef,
      record,
      measureFields,
      rowFields,
      colFields,
      rowMemberMeta,
      colMemberMeta,
      totalLabel,
      subTotalLabel,
      ctx,
    )
  }

  const subTotals = dataCfg.subTotals ?? []
  for (let i = 0; i < subTotals.length; i++) {
    const record = subTotals[i]!
    const ctx = `subTotals[${i}]`
    if (record.subTotalAxis !== 'row' && record.subTotalAxis !== 'column') {
      throw new AggregatedContractError(`${ctx}: subTotalAxis must be 'row' or 'column'`)
    }
    let rowRef: InternalAxisRef
    let colRef: InternalAxisRef
    if (record.subTotalAxis === 'row') {
      rowRef = readSubTotalAxis(record, rowFields, rowCoverage, `${ctx}.row`)
      colRef = readDetailPath(record, colFields, `${ctx}.column`)
    } else {
      rowRef = readDetailPath(record, rowFields, `${ctx}.row`)
      colRef = readSubTotalAxis(record, colFields, colCoverage, `${ctx}.column`)
    }
    ingestCell(
      store,
      seenCells,
      rowTree,
      colTree,
      rowRef,
      colRef,
      record,
      measureFields,
      rowFields,
      colFields,
      rowMemberMeta,
      colMemberMeta,
      totalLabel,
      subTotalLabel,
      ctx,
    )
  }

  const totals = dataCfg.totals ?? []
  for (let i = 0; i < totals.length; i++) {
    const record = totals[i]!
    const ctx = `totals[${i}]`
    const rowRef = readGrandTotalAxis(record, rowFields, rowCoverage, `${ctx}.row`)
    const colRef = readGrandTotalAxis(record, colFields, colCoverage, `${ctx}.column`)
    if (rowRef.kind !== 'grandTotal' && colRef.kind !== 'grandTotal') {
      throw new AggregatedContractError(`${ctx}: totals row must roll up at least one axis`)
    }
    ingestCell(
      store,
      seenCells,
      rowTree,
      colTree,
      rowRef,
      colRef,
      record,
      measureFields,
      rowFields,
      colFields,
      rowMemberMeta,
      colMemberMeta,
      totalLabel,
      subTotalLabel,
      ctx,
    )
  }

  applyExpandState(rowTree, options.expandDepth, options.expandedRowPaths)
  applyExpandState(colTree, options.expandDepth, options.expandedColPaths)

  rowTree.version++
  colTree.version++
  store.version++

  return {
    rowTree,
    colTree,
    serverCells: store,
    measures,
    records: leaves,
  }
}

/** Map a layout node back to its axis kind for viewport typing */
export function nodeAxisKind(node: DimNode): AxisKind {
  if (node.kind === 'grandTotal') return 'grandTotal'
  if (node.kind === 'subTotal') return 'subtotal'
  return 'detail'
}
