import type {
  AggregatedDataCfg,
  AggregatedSubTotalRecord,
  AggregateOptions,
  PivotDataSource,
  PivotQuery,
  PivotRecord,
  PivotResult,
} from '@vue-pivot/core'

export const AGGREGATED_MOCK_URL = '/mock/aggregated-superstore.json'

interface AggregatedMockFile {
  fields: AggregatedDataCfg['fields']
  meta: AggregatedDataCfg['meta']
  fieldValues: NonNullable<AggregatedDataCfg['fieldValues']>
  aggregateWithTotals: AggregateOptions
  aggregateWithoutTotals: AggregateOptions
  data: PivotRecord[]
  subTotals: AggregatedSubTotalRecord[]
  totals: PivotRecord[]
}

let mockCache: AggregatedMockFile | null = null

export async function loadAggregatedMock(url = AGGREGATED_MOCK_URL): Promise<AggregatedMockFile> {
  if (mockCache) return mockCache
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load aggregated mock: ${res.status} ${url}`)
  }
  mockCache = (await res.json()) as AggregatedMockFile
  return mockCache
}

export function createInitialAggregatedCfg(
  mock: AggregatedMockFile,
  includeTotals = true,
): AggregatedDataCfg {
  return {
    dataKind: 'aggregated',
    fields: { ...mock.fields },
    meta: mock.meta,
    aggregate: includeTotals ? mock.aggregateWithTotals : mock.aggregateWithoutTotals,
    fieldValues: mock.fieldValues,
    data: [],
  }
}

function hasOwn(record: PivotRecord, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, field)
}

function matchesFilters(record: PivotRecord, query: PivotQuery): boolean {
  for (const f of query.preFilters) {
    if (f.operator !== 'in' || !Array.isArray(f.value)) continue
    if (!hasOwn(record, f.field)) continue
    if (!f.value.includes(record[f.field])) return false
  }
  return true
}

/** Mock PivotDataSource that fetches authoritative leaf/totals arrays from /public/mock */
export function createMockAggregatedDataSource(
  url = AGGREGATED_MOCK_URL,
): PivotDataSource {
  return {
    capabilities: () => ({
      serverAggregation: true,
      drill: false,
      topN: true,
      totals: true,
      asyncExpand: false,
      worker: false,
      streaming: false,
      supportedAggregators: ['sum', 'avg', 'count'],
    }),
    async query(request, signal) {
      const mock = await loadAggregatedMock(url)
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

      const wantTotals = Boolean(
        request.totals?.row?.showGrandTotals ||
          request.totals?.row?.showSubTotals ||
          request.totals?.column?.showGrandTotals,
      )

      const records = mock.data.filter((r) => matchesFilters(r, request))
      const subTotals = wantTotals
        ? mock.subTotals.filter((r) => matchesFilters(r, request))
        : undefined
      const totals = wantTotals
        ? mock.totals.filter((r) => matchesFilters(r, request))
        : undefined

      return {
        queryId: request.queryId,
        rowTreeVersion: 1,
        colTreeVersion: 1,
        aggregate: wantTotals ? mock.aggregateWithTotals : mock.aggregateWithoutTotals,
        fieldValues: mock.fieldValues,
        records,
        ...(subTotals ? { subTotals } : {}),
        ...(totals ? { totals } : {}),
      } satisfies PivotResult
    },
  }
}
