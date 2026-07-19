import type { MeasureField, PivotRecord, PreAggregatedCell } from '../types/data-cfg'
import type { DimTree } from './dim-tree'
import { getAncestors } from './dim-tree'
import {
  deserializeAggregatorState,
  getAggregator,
  serializeAggregatorState,
  type Aggregator,
} from './aggregator'

export type CubeKey = string

export function makeCubeKey(rowNodeId: number, colNodeId: number, measure: string): CubeKey {
  return `${rowNodeId}|${colNodeId}|${measure}`
}

export interface CubeCellState {
  aggregatorId: string
  state: unknown
  finalized?: unknown
  dirty: boolean
}

export interface LazyCube {
  version: number
  cells: Map<CubeKey, CubeCellState>
  /** record indexes per leaf path combination */
  leafBuckets: Map<string, number[]>
  hit: number
  miss: number
}

export function createCube(): LazyCube {
  return {
    version: 1,
    cells: new Map(),
    leafBuckets: new Map(),
    hit: 0,
    miss: 0,
  }
}

function leafBucketKey(rowLeafId: number, colLeafId: number): string {
  return `${rowLeafId}|${colLeafId}`
}

export function indexRecords(
  cube: LazyCube,
  records: PivotRecord[],
  rowTree: DimTree,
  colTree: DimTree,
  rowFields: string[],
  colFields: string[],
): void {
  cube.leafBuckets.clear()
  for (let i = 0; i < records.length; i++) {
    const record = records[i]!
    const rowPath = rowFields.map((f) => (record[f] == null ? '(null)' : String(record[f])))
    const colPath = colFields.map((f) => (record[f] == null ? '(null)' : String(record[f])))
    const rowKey = rowPath.map(encodeURIComponent).join('\u0001')
    const colKey = colPath.map(encodeURIComponent).join('\u0001')
    const rowId = rowTree.pathIndex.get(rowKey)
    const colId = colTree.pathIndex.get(colKey)
    if (rowId == null || colId == null) continue
    const key = leafBucketKey(rowId, colId)
    const bucket = cube.leafBuckets.get(key)
    if (bucket) bucket.push(i)
    else cube.leafBuckets.set(key, [i])
  }
  cube.version++
}

function collectLeafIds(tree: DimTree, nodeId: number): number[] {
  const node = tree.nodes.get(nodeId)
  if (!node) return []
  if (node.kind === 'grandTotal') {
    // all leaves under root
    return [...tree.nodes.values()].filter((n) => n.isLeaf && n.kind === 'dimension').map((n) => n.id)
  }
  if (node.kind === 'subTotal') {
    const parent = node.parentId == null ? null : tree.nodes.get(node.parentId)
    if (!parent) return []
    return flattenLeaves(tree, parent.id)
  }
  if (node.isLeaf) return [node.id]
  return flattenLeaves(tree, nodeId)
}

function flattenLeaves(tree: DimTree, nodeId: number): number[] {
  const node = tree.nodes.get(nodeId)
  if (!node) return []
  if (node.isLeaf && node.kind === 'dimension') return [node.id]
  const out: number[] = []
  for (const cid of node.children) {
    const child = tree.nodes.get(cid)!
    if (child.kind === 'subTotal' || child.kind === 'grandTotal') continue
    out.push(...flattenLeaves(tree, cid))
  }
  return out
}

export function getCellValue(
  cube: LazyCube,
  records: PivotRecord[],
  rowTree: DimTree,
  colTree: DimTree,
  rowNodeId: number,
  colNodeId: number,
  measure: MeasureField,
): unknown {
  const key = makeCubeKey(rowNodeId, colNodeId, measure.field)
  const cached = cube.cells.get(key)
  if (cached && !cached.dirty && cached.finalized !== undefined) {
    cube.hit++
    return cached.finalized
  }
  cube.miss++

  const aggregatorId = measure.aggregation ?? 'sum'
  const agg = getAggregator(aggregatorId)
  const state = agg.init()

  const rowLeaves = collectLeafIds(rowTree, rowNodeId)
  const colLeaves = collectLeafIds(colTree, colNodeId)

  for (const r of rowLeaves) {
    for (const c of colLeaves) {
      const bucket = cube.leafBuckets.get(leafBucketKey(r, c))
      if (!bucket) continue
      for (const idx of bucket) {
        const record = records[idx]!
        agg.add(state, record[measure.field], record)
      }
    }
  }

  const finalized = agg.finalize(state)
  cube.cells.set(key, {
    aggregatorId,
    state: serializeAggregatorState(aggregatorId, state),
    finalized,
    dirty: false,
  })
  return finalized
}

export function ingestPreAggregated(
  cube: LazyCube,
  rowTree: DimTree,
  colTree: DimTree,
  cells: PreAggregatedCell[],
  measures: MeasureField[],
): void {
  for (const cell of cells) {
    const rowKey = cell.rowPath.map((v) => encodeURIComponent(String(v))).join('\u0001')
    const colKey = cell.colPath.map((v) => encodeURIComponent(String(v))).join('\u0001')
    const rowId = rowTree.pathIndex.get(rowKey)
    const colId = colTree.pathIndex.get(colKey)
    if (rowId == null || colId == null) continue
    for (const measure of measures) {
      const value = cell.values[measure.field]
      if (value === undefined) continue
      const key = makeCubeKey(rowId, colId, measure.field)
      cube.cells.set(key, {
        aggregatorId: measure.aggregation ?? 'sum',
        state: value,
        finalized: value,
        dirty: false,
      })
    }
  }
  cube.version++
}

export function invalidateCube(
  cube: LazyCube,
  scope: 'all' | { cells: Array<{ rowNodeId: number; colNodeId: number }> },
  rowTree?: DimTree,
): void {
  if (scope === 'all') {
    cube.cells.clear()
    cube.version++
    return
  }
  for (const cell of scope.cells) {
    for (const [key, value] of cube.cells) {
      if (key.startsWith(`${cell.rowNodeId}|${cell.colNodeId}|`)) {
        value.dirty = true
      }
    }
    if (rowTree) {
      for (const ancestor of getAncestors(rowTree, cell.rowNodeId)) {
        for (const [key, value] of cube.cells) {
          if (key.startsWith(`${ancestor}|`)) value.dirty = true
        }
      }
    }
  }
  cube.version++
}

export function mergePartialState(
  cube: LazyCube,
  rowNodeId: number,
  colNodeId: number,
  measure: string,
  aggregatorId: string,
  partial: unknown,
): void {
  const key = makeCubeKey(rowNodeId, colNodeId, measure)
  const agg = getAggregator(aggregatorId) as Aggregator
  const existing = cube.cells.get(key)
  if (!existing) {
    const state = deserializeAggregatorState(aggregatorId, partial)
    cube.cells.set(key, {
      aggregatorId,
      state: serializeAggregatorState(aggregatorId, state),
      finalized: agg.finalize(state),
      dirty: false,
    })
    return
  }
  const current = deserializeAggregatorState(aggregatorId, existing.state)
  const incoming = deserializeAggregatorState(aggregatorId, partial)
  agg.merge(current, incoming)
  existing.state = serializeAggregatorState(aggregatorId, current)
  existing.finalized = agg.finalize(current)
  existing.dirty = false
}
