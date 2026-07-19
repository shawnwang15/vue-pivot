import type { PivotState } from '../state/pivot-state'
import type { PivotQuery } from '../types/pivot-query'
import { normalizeMeasures } from '../types/data-cfg'

let querySeq = 0

export function nextQueryId(): string {
  querySeq += 1
  return `q_${Date.now()}_${querySeq}`
}

export function buildPivotQuery(state: PivotState, viewport?: PivotQuery['viewport']): PivotQuery {
  const fields = state.dataCfg.fields
  const measures = normalizeMeasures(fields.values ?? [])
  const filters = state.filters
  return {
    queryId: nextQueryId(),
    axes: {
      rows: [...(fields.rows ?? [])],
      columns: [...(fields.columns ?? [])],
      values: measures,
      valueInCols: fields.valueInCols !== false,
    },
    measures,
    preFilters: filters.filter((f) => !f.postAggregation),
    postFilters: filters.filter((f) => f.postAggregation),
    sort: state.sort,
    topN: state.topN,
    totals: state.options.totals ?? {},
    hierarchyType: state.options.hierarchyType ?? 'grid',
    expandedRowPaths: state.expandedRowPaths,
    expandedColPaths: state.expandedColPaths,
    expandDepth: state.options.defaultExpandDepth ?? state.options.style?.rowCell?.expandDepth ?? 1,
    viewport,
  }
}
