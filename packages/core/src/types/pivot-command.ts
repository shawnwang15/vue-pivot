import type { AggregatorId, DataCfg } from './data-cfg'
import type { FilterSpec, PivotOptions, SortSpec, TopNSpec } from './options'
import type { SelectionRange } from './selection'

export type PivotCommand =
  | { type: 'setDataCfg'; dataCfg: DataCfg }
  | { type: 'setOptions'; options: Partial<PivotOptions> }
  | { type: 'expand'; axis: 'row' | 'column'; path: string[] }
  | { type: 'collapse'; axis: 'row' | 'column'; path: string[] }
  | { type: 'setExpandDepth'; axis: 'row' | 'column'; depth: number }
  | { type: 'sort'; sort: SortSpec[] }
  | { type: 'filter'; filters: FilterSpec[] }
  | { type: 'topN'; topN: TopNSpec[] }
  | { type: 'moveField'; from: FieldZone; to: FieldZone; field: string; index?: number }
  | { type: 'setMeasureAggregation'; field: string; aggregation: AggregatorId }
  | { type: 'resizeColumn'; columnId: string; width: number }
  | { type: 'setColumnVisibility'; columnId: string; visible: boolean }
  | { type: 'reorderColumns'; columnIds: string[] }
  | { type: 'pinColumn'; columnId: string; pinned: 'left' | 'right' | false }
  | { type: 'setSelection'; selection: SelectionRange[] }
  | { type: 'clearSelection' }
  | { type: 'brushSelect'; range: SelectionRange }
  | { type: 'drillDown'; axis: 'row' | 'column'; path: string[]; field?: string }
  | { type: 'rollUp'; axis: 'row' | 'column'; path: string[] }
  | { type: 'invalidate'; scope: InvalidateScope }
  | { type: 'setViewport'; rowStart: number; colStart: number }

export type FieldZone = 'rows' | 'columns' | 'values' | 'filters' | 'available'

export type InvalidateScope =
  | 'all'
  | 'cube'
  | 'rowTree'
  | 'colTree'
  | 'layout'
  | 'selection'
  | { cells: Array<{ rowNodeId: number; colNodeId: number }> }
