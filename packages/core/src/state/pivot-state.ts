import type { DataCfg, MeasureField, PivotRecord } from '../types/data-cfg'
import { normalizeMeasures } from '../types/data-cfg'
import type { FilterSpec, PivotOptions, SortSpec, TopNSpec } from '../types/options'
import type { SelectionRange } from '../types/selection'
import type { QueryStatus } from '../types/pivot-query'
import type { DimTree } from '../engine/dim-tree'
import { createDimTree } from '../engine/dim-tree'
import type { LazyCube } from '../engine/cube'
import { createCube } from '../engine/cube'

export interface ColumnUIState {
  widths: Map<string, number>
  visibility: Map<string, boolean>
  order: string[]
  pinned: Map<string, 'left' | 'right' | false>
}

export interface PivotState {
  version: number
  queryVersion: number
  dataCfg: DataCfg
  options: PivotOptions
  records: PivotRecord[]
  measures: MeasureField[]
  rowTree: DimTree
  colTree: DimTree
  cube: LazyCube
  sort: SortSpec[]
  filters: FilterSpec[]
  topN: TopNSpec[]
  expandedRowPaths: string[][]
  expandedColPaths: string[][]
  selection: SelectionRange[]
  columnUI: ColumnUIState
  status: QueryStatus
  error: string | null
  loadingQueryId: string | null
  viewportCursor: { rowStart: number; colStart: number }
}

export function createInitialState(
  dataCfg: DataCfg = { fields: { rows: [], columns: [], values: [] }, data: [] },
  options: PivotOptions = {},
): PivotState {
  return {
    version: 1,
    queryVersion: 1,
    dataCfg,
    options: {
      hierarchyType: 'grid',
      defaultExpandDepth: options.style?.rowCell?.expandDepth ?? 1,
      ...options,
    },
    records: dataCfg.data ?? [],
    measures: normalizeMeasures(dataCfg.fields.values ?? []),
    rowTree: createDimTree(),
    colTree: createDimTree(),
    cube: createCube(),
    sort: options.sort ?? [],
    filters: options.filters ?? [],
    topN: options.topN ?? [],
    expandedRowPaths: [],
    expandedColPaths: [],
    selection: [],
    columnUI: {
      widths: new Map(),
      visibility: new Map(),
      order: [],
      pinned: new Map(),
    },
    status: 'idle',
    error: null,
    loadingQueryId: null,
    viewportCursor: { rowStart: 0, colStart: 0 },
  }
}
