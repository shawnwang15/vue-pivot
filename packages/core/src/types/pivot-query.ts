import type {
  AggregateOptions,
  AggregatedSubTotalRecord,
  DataKind,
  FieldName,
  MeasureField,
  PivotRecord,
  SheetType,
} from './data-cfg'
import type { FilterSpec, HierarchyType, SortSpec, TopNSpec, TotalsOptions } from './options'

export interface ViewportRange {
  rowStart: number
  rowEnd: number
  colStart: number
  colEnd: number
  overscanRow?: number
  overscanCol?: number
}

export interface PivotQuery {
  queryId: string
  /** Data shape expected by the consumer after this query */
  dataKind: DataKind
  /** Layout mode; table = flat detail sheet */
  sheetType: SheetType
  axes: {
    rows: string[]
    columns: string[]
    values: MeasureField[]
    valueInCols: boolean
  }
  measures: MeasureField[]
  preFilters: FilterSpec[]
  postFilters: FilterSpec[]
  sort: SortSpec[]
  topN: TopNSpec[]
  totals: TotalsOptions
  hierarchyType: HierarchyType
  expandedRowPaths: string[][]
  expandedColPaths: string[][]
  expandDepth: number
  viewport?: ViewportRange
  page?: { offset: number; limit: number }
}

export interface DrillQuery {
  queryId: string
  axis: 'row' | 'column'
  path: string[]
  childrenField: string
  parentQueryId?: string
}

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error' | 'stale'

export interface PivotResultCell {
  rowNodeId: number
  colNodeId: number
  measure: string
  value: unknown
  formatted?: string
}

export interface PivotResult {
  queryId: string
  rowTreeVersion: number
  colTreeVersion: number
  /** Local / legacy nodeId cells — not used as public aggregated contract */
  cells?: PivotResultCell[]
  /** Aggregator partial states for merge (local/worker) */
  partials?: Array<{
    rowNodeId: number
    colNodeId: number
    measure: string
    aggregatorId: string
    state: unknown
  }>
  /**
   * Authoritative leaf records.
   * - raw/local: detail rows
   * - aggregated: complete leaf wide rows (no $pivot)
   */
  records?: PivotRecord[]
  /** Aggregated grand-total wide rows */
  totals?: PivotRecord[]
  /** Aggregated subtotal wide rows */
  subTotals?: AggregatedSubTotalRecord[]
  /** Aggregated coverage / sparse semantics (aggregated dataKind) */
  aggregate?: AggregateOptions
  /** Facet members for filter UI */
  fieldValues?: Record<FieldName, unknown[]>
  meta?: Record<string, unknown>
}

export interface DrillResult {
  queryId: string
  axis: 'row' | 'column'
  path: string[]
  children: Array<{ value: unknown; label?: string; isLeaf?: boolean }>
}
