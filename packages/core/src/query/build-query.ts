import type { PivotState } from '../state/pivot-state'
import type { PivotQuery } from '../types/pivot-query'
import { getDataKind, getSheetType, normalizeMeasures } from '../types/data-cfg'

let querySeq = 0

export function nextQueryId(): string {
  querySeq += 1
  return `q_${Date.now()}_${querySeq}`
}

export function buildPivotQuery(state: PivotState, viewport?: PivotQuery['viewport']): PivotQuery {
  const fields = state.dataCfg.fields
  const sheetType = getSheetType(state.dataCfg)
  const measures = sheetType === 'table' ? [] : normalizeMeasures(fields.values ?? [])
  const filters = state.filters
  return {
    queryId: nextQueryId(),
    dataKind: getDataKind(state.dataCfg),
    sheetType,
    axes: {
      rows: sheetType === 'table' ? [] : [...(fields.rows ?? [])],
      columns: [...(fields.columns ?? [])],
      values: measures,
      valueInCols: fields.valueInCols !== false,
    },
    measures,
    preFilters: filters.filter((f) => !f.postAggregation),
    postFilters: sheetType === 'table' ? [] : filters.filter((f) => f.postAggregation),
    sort: state.sort,
    topN: sheetType === 'table' ? [] : state.topN,
    totals: sheetType === 'table' ? {} : (state.options.totals ?? {}),
    hierarchyType: state.options.hierarchyType ?? 'grid',
    expandedRowPaths: sheetType === 'table' ? [] : state.expandedRowPaths,
    expandedColPaths: sheetType === 'table' ? [] : state.expandedColPaths,
    expandDepth: state.options.defaultExpandDepth ?? state.options.style?.rowCell?.expandDepth ?? 1,
    viewport,
  }
}
