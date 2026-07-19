import type { DrillQuery, DrillResult, PivotQuery, PivotResult } from '../types/pivot-query'
import type { PivotRecord } from '../types/data-cfg'
import { applyPreFilters, applyTopN, sortRecords } from '../engine/filter-sort'
import { buildDimTreeFromRecords, pathKey } from '../engine/dim-tree'
import { createCube, indexRecords, getCellValue } from '../engine/cube'
import { getVisibleLeaves } from '../engine/dim-tree'

export interface DataSourceCapabilities {
  serverAggregation: boolean
  drill: boolean
  topN: boolean
  totals: boolean
  asyncExpand: boolean
  worker: boolean
  streaming: boolean
  supportedAggregators: string[]
}

export interface PivotDataSource {
  query(request: PivotQuery, signal: AbortSignal): Promise<PivotResult>
  drill?(request: DrillQuery, signal: AbortSignal): Promise<DrillResult>
  capabilities(): DataSourceCapabilities
}

export const DEFAULT_CAPABILITIES: DataSourceCapabilities = {
  serverAggregation: false,
  drill: false,
  topN: true,
  totals: true,
  asyncExpand: false,
  worker: false,
  streaming: false,
  supportedAggregators: ['sum', 'avg', 'count', 'min', 'max', 'distinctCount'],
}

export class LocalDataSource implements PivotDataSource {
  constructor(private records: PivotRecord[]) {}

  setRecords(records: PivotRecord[]): void {
    this.records = records
  }

  capabilities(): DataSourceCapabilities {
    return { ...DEFAULT_CAPABILITIES }
  }

  async query(request: PivotQuery, signal: AbortSignal): Promise<PivotResult> {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    let records = applyPreFilters(this.records, request.preFilters)
    records = applyTopN(records, request.topN)
    records = sortRecords(records, request.sort)

    const rowTree = buildDimTreeFromRecords({
      records,
      fields: request.axes.rows,
      hierarchyType: request.hierarchyType,
      expandDepth: request.expandDepth,
      expandedPaths: request.expandedRowPaths,
      totals: request.totals.row,
    })
    const colTree = buildDimTreeFromRecords({
      records,
      fields: request.axes.columns,
      hierarchyType: 'grid',
      expandDepth: request.expandDepth,
      expandedPaths: request.expandedColPaths,
      totals: request.totals.column,
    })
    const cube = createCube()
    indexRecords(cube, records, rowTree, colTree, request.axes.rows, request.axes.columns)

    const rowLeaves = getVisibleLeaves(rowTree, request.hierarchyType)
    const colLeaves = getVisibleLeaves(colTree, 'grid')
    const cells = []
    for (const row of rowLeaves) {
      for (const col of colLeaves) {
        for (const measure of request.measures) {
          const value = getCellValue(cube, records, rowTree, colTree, row.id, col.id, measure)
          cells.push({
            rowNodeId: row.id,
            colNodeId: col.id,
            measure: measure.field,
            value,
          })
        }
      }
    }

    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    return {
      queryId: request.queryId,
      rowTreeVersion: rowTree.version,
      colTreeVersion: colTree.version,
      cells,
      records,
      meta: {
        rowCount: rowLeaves.length,
        colCount: colLeaves.length,
      },
    }
  }
}

export class ServerDataSource implements PivotDataSource {
  constructor(
    private endpoint: string,
    private caps: Partial<DataSourceCapabilities> = {},
  ) {}

  capabilities(): DataSourceCapabilities {
    return {
      ...DEFAULT_CAPABILITIES,
      serverAggregation: true,
      drill: true,
      asyncExpand: true,
      ...this.caps,
    }
  }

  async query(request: PivotQuery, signal: AbortSignal): Promise<PivotResult> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'query', request }),
      signal,
    })
    if (!res.ok) throw new Error(`ServerDataSource query failed: ${res.status}`)
    return (await res.json()) as PivotResult
  }

  async drill(request: DrillQuery, signal: AbortSignal): Promise<DrillResult> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'drill', request }),
      signal,
    })
    if (!res.ok) throw new Error(`ServerDataSource drill failed: ${res.status}`)
    return (await res.json()) as DrillResult
  }
}

export interface QueryController {
  run<T>(queryId: string, exec: (signal: AbortSignal) => Promise<T>): Promise<T | null>
  cancel(): void
  get activeQueryId(): string | null
}

export function createQueryController(): QueryController {
  let controller: AbortController | null = null
  let activeQueryId: string | null = null

  return {
    get activeQueryId() {
      return activeQueryId
    },
    cancel() {
      controller?.abort()
      controller = null
      activeQueryId = null
    },
    async run(queryId, exec) {
      controller?.abort()
      controller = new AbortController()
      activeQueryId = queryId
      const signal = controller.signal
      try {
        const result = await exec(signal)
        if (activeQueryId !== queryId) return null
        return result
      } catch (err) {
        if (signal.aborted) return null
        throw err
      } finally {
        if (activeQueryId === queryId) {
          activeQueryId = null
          controller = null
        }
      }
    },
  }
}

export function assertCapability(
  caps: DataSourceCapabilities,
  feature: keyof DataSourceCapabilities,
): void {
  if (!caps[feature]) {
    throw new Error(`[vue-pivot] DataSource does not support capability: ${String(feature)}`)
  }
}

export { pathKey }
