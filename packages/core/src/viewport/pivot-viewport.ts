import type { ColumnLayout, PivotCell, PivotWindow, RowLayout } from '../types/layout'
import type { ViewportRange } from '../types/pivot-query'
import type { DataKind, MeasureField, SheetType } from '../types/data-cfg'
import type { DimTree } from '../engine/dim-tree'
import { getVisibleLeaves } from '../engine/dim-tree'
import type { LazyCube } from '../engine/cube'
import { getCellValue } from '../engine/cube'
import type { PivotRecord } from '../types/data-cfg'
import type { HierarchyType, NullPrecisionOptions, PivotOptions } from '../types/options'
import { formatValue, getFieldMeta } from '../engine/format'
import type { DataCfg } from '../types/data-cfg'
import { applyPostFilters } from '../engine/filter-sort'
import type { FilterSpec } from '../types/options'
import type { ServerCellStore } from '../engine/server-result'
import { getServerCellValue } from '../engine/server-result'

export interface ViewportContext {
  rowTree: DimTree
  colTree: DimTree
  cube: LazyCube
  serverCells: ServerCellStore
  dataKind: DataKind
  sheetType: SheetType
  records: PivotRecord[]
  measures: MeasureField[]
  valueInCols: boolean
  hierarchyType: HierarchyType
  options: PivotOptions
  dataCfg: DataCfg
  columnWidths: Map<string, number>
  columnVisibility: Map<string, boolean>
  columnOrder: string[]
  pinnedColumns: Map<string, 'left' | 'right' | false>
  postFilters: FilterSpec[]
}

function measureLabel(m: MeasureField, dataCfg: DataCfg): string {
  return m.name ?? getFieldMeta(dataCfg, m.field)?.name ?? m.field
}

export function buildRowLayouts(ctx: ViewportContext): RowLayout[] {
  const rowHeight = ctx.options.style?.rowHeight ?? 32
  if (ctx.sheetType === 'table') {
    return ctx.records.map((_, index) => ({
      index,
      nodeId: index,
      path: [String(index)],
      label: String(index + 1),
      depth: 0,
      isLeaf: true,
      expanded: false,
      kind: 'dimension' as const,
      height: rowHeight,
      parentId: null,
    }))
  }

  const leaves = getVisibleLeaves(ctx.rowTree, ctx.hierarchyType)
  return leaves.map((node, index) => ({
    index,
    nodeId: node.id,
    path: node.path,
    label: node.label,
    depth: node.depth,
    isLeaf: node.isLeaf,
    expanded: node.expanded,
    kind: node.kind,
    height: rowHeight,
    parentId: node.parentId,
  }))
}

function buildTableColumnLayouts(ctx: ViewportContext): ColumnLayout[] {
  const defaultWidth = ctx.options.style?.colWidth ?? 120
  const fields = ctx.dataCfg.fields.columns ?? []
  const cols: ColumnLayout[] = []
  for (const field of fields) {
    const columnId = field
    if (ctx.columnVisibility.get(columnId) === false) continue
    cols.push({
      index: cols.length,
      nodeId: cols.length,
      path: [field],
      label: getFieldMeta(ctx.dataCfg, field)?.name ?? field,
      depth: 0,
      isLeaf: true,
      expanded: false,
      kind: 'dimension',
      width: ctx.columnWidths.get(columnId) ?? defaultWidth,
      measure: field,
      columnId,
      parentId: null,
      pinned: ctx.pinnedColumns.get(columnId) ?? false,
      visible: true,
    })
  }

  if (ctx.columnOrder.length) {
    const orderIndex = new Map(ctx.columnOrder.map((id, i) => [id, i]))
    cols.sort((a, b) => {
      const ai = orderIndex.get(a.columnId) ?? Number.MAX_SAFE_INTEGER
      const bi = orderIndex.get(b.columnId) ?? Number.MAX_SAFE_INTEGER
      if (ai !== bi) return ai - bi
      return a.index - b.index
    })
  }
  cols.sort((a, b) => {
    const ap = a.pinned === 'left' ? 0 : a.pinned === 'right' ? 2 : 1
    const bp = b.pinned === 'left' ? 0 : b.pinned === 'right' ? 2 : 1
    if (ap !== bp) return ap - bp
    return a.index - b.index
  })
  cols.forEach((c, i) => {
    c.index = i
  })
  return cols
}

export function buildColumnLayouts(ctx: ViewportContext): ColumnLayout[] {
  if (ctx.sheetType === 'table') return buildTableColumnLayouts(ctx)

  const leaves = getVisibleLeaves(ctx.colTree, ctx.hierarchyType === 'grid' ? 'grid' : ctx.hierarchyType)
  const defaultWidth = ctx.options.style?.colWidth ?? 120
  const cols: ColumnLayout[] = []

  if (ctx.valueInCols) {
    for (const leaf of leaves) {
      for (const measure of ctx.measures) {
        const columnId = `${leaf.path.join('/')}/${measure.field}`
        if (ctx.columnVisibility.get(columnId) === false) continue
        cols.push({
          index: cols.length,
          nodeId: leaf.id,
          path: [...leaf.path, measure.field],
          label: measureLabel(measure, ctx.dataCfg),
          depth: leaf.depth + 1,
          isLeaf: true,
          expanded: leaf.expanded,
          kind: leaf.kind === 'dimension' ? 'measure' : leaf.kind,
          width: ctx.columnWidths.get(columnId) ?? defaultWidth,
          measure: measure.field,
          columnId,
          parentId: leaf.id,
          pinned: ctx.pinnedColumns.get(columnId) ?? false,
          visible: true,
        })
      }
    }
  } else if (ctx.measures.length <= 1) {
    const measure = ctx.measures[0]
    for (const leaf of leaves) {
      const columnId = leaf.path.join('/') || 'value'
      if (ctx.columnVisibility.get(columnId) === false) continue
      cols.push({
        index: cols.length,
        nodeId: leaf.id,
        path: leaf.path,
        label: leaf.label || (measure ? measureLabel(measure, ctx.dataCfg) : ''),
        depth: leaf.depth,
        isLeaf: true,
        expanded: leaf.expanded,
        kind: leaf.kind,
        width: ctx.columnWidths.get(columnId) ?? defaultWidth,
        measure: measure?.field,
        columnId,
        parentId: leaf.parentId,
        pinned: ctx.pinnedColumns.get(columnId) ?? false,
        visible: true,
      })
    }
  } else {
    // values in rows conceptually — still expose measure as column groups for first measure leaf set
    for (const measure of ctx.measures) {
      for (const leaf of leaves) {
        const columnId = `${measure.field}/${leaf.path.join('/')}`
        if (ctx.columnVisibility.get(columnId) === false) continue
        cols.push({
          index: cols.length,
          nodeId: leaf.id,
          path: [measure.field, ...leaf.path],
          label: leaf.label,
          depth: leaf.depth + 1,
          isLeaf: true,
          expanded: leaf.expanded,
          kind: leaf.kind === 'dimension' ? 'measure' : leaf.kind,
          width: ctx.columnWidths.get(columnId) ?? defaultWidth,
          measure: measure.field,
          columnId,
          parentId: leaf.id,
          pinned: ctx.pinnedColumns.get(columnId) ?? false,
          visible: true,
        })
      }
    }
  }

  if (ctx.columnOrder.length) {
    const orderIndex = new Map(ctx.columnOrder.map((id, i) => [id, i]))
    cols.sort((a, b) => {
      const ai = orderIndex.get(a.columnId) ?? Number.MAX_SAFE_INTEGER
      const bi = orderIndex.get(b.columnId) ?? Number.MAX_SAFE_INTEGER
      if (ai !== bi) return ai - bi
      return a.index - b.index
    })
    cols.forEach((c, i) => {
      c.index = i
    })
  }

  // pinned left first
  cols.sort((a, b) => {
    const ap = a.pinned === 'left' ? 0 : a.pinned === 'right' ? 2 : 1
    const bp = b.pinned === 'left' ? 0 : b.pinned === 'right' ? 2 : 1
    if (ap !== bp) return ap - bp
    return a.index - b.index
  })
  cols.forEach((c, i) => {
    c.index = i
  })

  return cols
}

export interface PivotViewport {
  rowCount: number
  columnCount: number
  getRow(index: number): RowLayout
  getColumn(index: number): ColumnLayout
  getCell(rowIndex: number, columnIndex: number): PivotCell
  getWindow(range: ViewportRange): PivotWindow
  getRows(): RowLayout[]
  getColumns(): ColumnLayout[]
}

export function createPivotViewport(ctx: ViewportContext): PivotViewport {
  let rows = buildRowLayouts(ctx)
  let columns = buildColumnLayouts(ctx)
  const nullPrecision: NullPrecisionOptions | undefined = ctx.options.nullPrecision

  const getCell = (rowIndex: number, columnIndex: number): PivotCell => {
    const row = rows[rowIndex]
    const col = columns[columnIndex]
    if (!row || !col) {
      return {
        rowIndex,
        colIndex: columnIndex,
        rowNodeId: -1,
        colNodeId: -1,
        measure: '',
        value: null,
        formatted: '-',
      }
    }

    if (ctx.sheetType === 'table') {
      const field = col.measure ?? col.path[0] ?? ''
      const value = ctx.records[rowIndex]?.[field] ?? null
      const meta = getFieldMeta(ctx.dataCfg, field)
      return {
        rowIndex,
        colIndex: columnIndex,
        rowNodeId: row.nodeId,
        colNodeId: col.nodeId,
        measure: field,
        value,
        formatted: formatValue(value, meta?.formatter, nullPrecision),
        raw: value,
        type: 'data',
      }
    }

    const measureField =
      col.measure ??
      ctx.measures[0]?.field ??
      ''
    const measure =
      ctx.measures.find((m) => m.field === measureField) ??
      ({ field: measureField, aggregation: 'sum' } as MeasureField)

    let value: unknown
    if (ctx.dataKind === 'aggregated') {
      // Authoritative lookup only — never fall back to aggregators
      value = getServerCellValue(ctx.serverCells, row.nodeId, col.nodeId, measure.field)
    } else {
      value = getCellValue(
        ctx.cube,
        ctx.records,
        ctx.rowTree,
        ctx.colTree,
        row.nodeId,
        col.nodeId,
        measure,
      )
      if (!applyPostFilters(value, ctx.postFilters, measure.field)) {
        value = null
      }
    }

    const meta = getFieldMeta(ctx.dataCfg, measure.field)
    const formatted =
      ctx.dataKind === 'aggregated' && value === null
        ? formatValue(null, meta?.formatter, { ...nullPrecision, nullDisplay: nullPrecision?.nullDisplay ?? '' })
        : formatValue(value, meta?.formatter, nullPrecision)
    const kind = row.kind === 'grandTotal' || col.kind === 'grandTotal' || row.kind === 'subTotal' || col.kind === 'subTotal'
      ? 'total'
      : 'data'

    return {
      rowIndex,
      colIndex: columnIndex,
      rowNodeId: row.nodeId,
      colNodeId: col.nodeId,
      measure: measure.field,
      value,
      formatted,
      raw: value,
      type: kind,
    }
  }

  return {
    get rowCount() {
      return rows.length
    },
    get columnCount() {
      return columns.length
    },
    getRow: (index) => rows[index]!,
    getColumn: (index) => columns[index]!,
    getCell,
    getRows: () => rows,
    getColumns: () => columns,
    getWindow(range) {
      const rowStart = Math.max(0, range.rowStart - (range.overscanRow ?? 0))
      const rowEnd = Math.min(rows.length, range.rowEnd + (range.overscanRow ?? 0))
      const colStart = Math.max(0, range.colStart - (range.overscanCol ?? 0))
      const colEnd = Math.min(columns.length, range.colEnd + (range.overscanCol ?? 0))
      const windowRows = rows.slice(rowStart, rowEnd)
      const windowCols = columns.slice(colStart, colEnd)
      const cells: PivotCell[] = []
      for (let r = rowStart; r < rowEnd; r++) {
        for (let c = colStart; c < colEnd; c++) {
          cells.push(getCell(r, c))
        }
      }
      return {
        range: { rowStart, rowEnd, colStart, colEnd },
        rows: windowRows,
        columns: windowCols,
        cells,
      }
    },
  }
}

/** Rebuild cached layouts after tree/options change */
export function refreshViewportLayouts(viewport: PivotViewport, ctx: ViewportContext): void {
  const next = createPivotViewport(ctx)
  Object.assign(viewport, next)
}
