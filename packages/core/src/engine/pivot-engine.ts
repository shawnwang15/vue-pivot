import type { AggregatedDataCfg, DataCfg } from '../types'
import type { PivotOptions } from '../types'
import type { PivotCommand } from '../types'
import type { PivotState } from '../state/pivot-state'
import { createInitialState } from '../state/pivot-state'
import { reducePivotState } from '../commands/reduce'
import { buildDimTreeFromRecords } from './dim-tree'
import { createCube, indexRecords, ingestPreAggregated, invalidateCube } from './cube'
import { applyPreFilters, applyTopN, sortRecords } from './filter-sort'
import { createPivotViewport, type PivotViewport, type ViewportContext } from '../viewport/pivot-viewport'
import { buildPivotQuery } from '../query/build-query'
import {
  createQueryController,
  LocalDataSource,
  type PivotDataSource,
  type QueryController,
} from '../datasource/pivot-data-source'
import { WorkerExecutor, createWorkerRequest } from '../worker/pivot-worker'
import {
  getDataKind,
  isAggregatedDataCfg,
  normalizeMeasures,
  type AggregatedSubTotalRecord,
  type PivotRecord,
} from '../types'
import {
  AggregatedContractError,
  buildAggregatedResult,
  createServerCellStore,
} from './server-result'
import type { PivotQuery, PivotResult } from '../types/pivot-query'

export type PivotListener = (state: PivotState) => void
export type QueryChangeListener = (query: PivotQuery) => void

export interface PivotEngineOptions {
  dataCfg?: DataCfg
  options?: PivotOptions
  dataSource?: PivotDataSource
  useWorker?: boolean
  workerUrl?: string | URL
  /** When true (default), aggregated query changes auto-call refreshFromDataSource if dataSource is set */
  autoFetch?: boolean
}

export class PivotEngine {
  private state: PivotState
  private listeners = new Set<PivotListener>()
  private queryListeners = new Set<QueryChangeListener>()
  private viewport: PivotViewport
  private dataSource: PivotDataSource
  private queryController: QueryController
  private workerExecutor: WorkerExecutor | null
  private useWorker: boolean
  private autoFetch: boolean

  constructor(opts: PivotEngineOptions = {}) {
    this.state = createInitialState(opts.dataCfg, opts.options)
    this.dataSource = opts.dataSource ?? new LocalDataSource(this.state.records)
    this.queryController = createQueryController()
    this.useWorker = Boolean(opts.useWorker)
    this.workerExecutor = opts.useWorker ? new WorkerExecutor(opts.workerUrl) : null
    this.autoFetch = opts.autoFetch !== false

    if (this.useWorker && getDataKind(this.state.dataCfg) === 'aggregated') {
      throw new Error('[vue-pivot] useWorker is incompatible with dataKind: "aggregated"')
    }

    this.rebuild(true)
    this.viewport = createPivotViewport(this.viewportContext())
  }

  getState(): PivotState {
    return this.state
  }

  getViewport(): PivotViewport {
    return this.viewport
  }

  subscribe(listener: PivotListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  onQueryChange(listener: QueryChangeListener): () => void {
    this.queryListeners.add(listener)
    return () => this.queryListeners.delete(listener)
  }

  private emit(): void {
    for (const l of this.listeners) l(this.state)
  }

  private emitQueryChange(): void {
    const query = buildPivotQuery(this.state)
    for (const l of this.queryListeners) l(query)
  }

  private viewportContext(): ViewportContext {
    return {
      rowTree: this.state.rowTree,
      colTree: this.state.colTree,
      cube: this.state.cube,
      serverCells: this.state.serverCells,
      dataKind: getDataKind(this.state.dataCfg),
      records: this.state.records,
      measures: this.state.measures,
      valueInCols: this.state.dataCfg.fields.valueInCols !== false,
      hierarchyType: this.state.options.hierarchyType ?? 'grid',
      options: this.state.options,
      dataCfg: this.state.dataCfg,
      columnWidths: this.state.columnUI.widths,
      columnVisibility: this.state.columnUI.visibility,
      columnOrder: this.state.columnUI.order,
      pinnedColumns: this.state.columnUI.pinned,
      postFilters:
        getDataKind(this.state.dataCfg) === 'aggregated'
          ? []
          : this.state.filters.filter((f) => f.postAggregation),
    }
  }

  private rebuildAggregated(): void {
    const cfg = this.state.dataCfg
    if (!isAggregatedDataCfg(cfg)) {
      throw new Error('[vue-pivot] rebuildAggregated called with non-aggregated dataCfg')
    }

    if (!cfg.data?.length) {
      this.state = {
        ...this.state,
        records: [],
        rowTree: this.state.rowTree,
        colTree: this.state.colTree,
        serverCells: createServerCellStore(),
        cube: createCube(),
        measures: normalizeMeasures(cfg.fields.values ?? []),
        status: this.state.status === 'stale' ? 'stale' : this.state.status,
        error: null,
      }
      // Keep empty trees when stale/empty
      const empty = buildAggregatedResult({
        dataCfg: { ...cfg, data: [] },
        hierarchyType: this.state.options.hierarchyType ?? 'grid',
        expandDepth:
          this.state.options.defaultExpandDepth ??
          this.state.options.style?.rowCell?.expandDepth ??
          1,
        expandedRowPaths: this.state.expandedRowPaths,
        expandedColPaths: this.state.expandedColPaths,
      })
      this.state = {
        ...this.state,
        rowTree: empty.rowTree,
        colTree: empty.colTree,
        serverCells: empty.serverCells,
        measures: empty.measures,
      }
      return
    }

    try {
      const built = buildAggregatedResult({
        dataCfg: cfg,
        hierarchyType: this.state.options.hierarchyType ?? 'grid',
        expandDepth:
          this.state.options.defaultExpandDepth ??
          this.state.options.style?.rowCell?.expandDepth ??
          1,
        expandedRowPaths: this.state.expandedRowPaths,
        expandedColPaths: this.state.expandedColPaths,
      })
      this.state = {
        ...this.state,
        records: built.records,
        rowTree: built.rowTree,
        colTree: built.colTree,
        serverCells: built.serverCells,
        cube: createCube(),
        measures: built.measures,
        status: 'success',
        error: null,
      }
    } catch (err) {
      this.state = {
        ...this.state,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
        serverCells: createServerCellStore(),
        cube: createCube(),
      }
      if (!(err instanceof AggregatedContractError)) throw err
    }
  }

  private rebuildRaw(full: boolean): void {
    let records = this.state.dataCfg.data ?? this.state.records
    records = applyPreFilters(records, this.state.filters)
    records = applyTopN(records, this.state.topN)
    records = sortRecords(records, this.state.sort)

    const expandDepth =
      this.state.options.defaultExpandDepth ??
      this.state.options.style?.rowCell?.expandDepth ??
      1

    const rowTree = buildDimTreeFromRecords({
      records,
      fields: this.state.dataCfg.fields.rows ?? [],
      hierarchyType: this.state.options.hierarchyType ?? 'grid',
      expandDepth,
      expandedPaths: this.state.expandedRowPaths,
      totals: this.state.options.totals?.row,
    })
    const colTree = buildDimTreeFromRecords({
      records,
      fields: this.state.dataCfg.fields.columns ?? [],
      hierarchyType: 'grid',
      expandDepth: this.state.options.style?.colCell?.expandDepth ?? expandDepth,
      expandedPaths: this.state.expandedColPaths,
      totals: this.state.options.totals?.column,
    })

    const cube = full ? createCube() : this.state.cube
    if (full) {
      indexRecords(
        cube,
        records,
        rowTree,
        colTree,
        this.state.dataCfg.fields.rows ?? [],
        this.state.dataCfg.fields.columns ?? [],
      )
      const pre = !isAggregatedDataCfg(this.state.dataCfg)
        ? this.state.dataCfg.preAggregated
        : undefined
      if (pre?.length) {
        ingestPreAggregated(
          cube,
          rowTree,
          colTree,
          pre,
          normalizeMeasures(this.state.dataCfg.fields.values ?? []),
        )
      }
    }

    this.state = {
      ...this.state,
      records,
      rowTree,
      colTree,
      cube,
      serverCells: createServerCellStore(),
      measures: normalizeMeasures(this.state.dataCfg.fields.values ?? []),
      status: 'success',
      error: null,
    }
  }

  private rebuild(full: boolean): void {
    if (getDataKind(this.state.dataCfg) === 'aggregated') {
      this.rebuildAggregated()
      return
    }
    this.rebuildRaw(full)
  }

  dispatch(command: PivotCommand): PivotState {
    const { state, invalidate, remoteRefresh } = reducePivotState(this.state, command)
    this.state = state

    if (invalidate === 'all') {
      // Aggregated + remoteRefresh: trees/cells already cleared; rebuild empty + notify
      this.rebuild(true)
      this.viewport = createPivotViewport(this.viewportContext())
      if (remoteRefresh) {
        this.emit()
        this.emitQueryChange()
        if (this.autoFetch && this.dataSource && !(this.dataSource instanceof LocalDataSource)) {
          void this.refreshFromDataSource()
        }
        return this.state
      }
    } else if (invalidate === 'cube') {
      invalidateCube(this.state.cube, 'all')
      this.viewport = createPivotViewport(this.viewportContext())
    } else if (invalidate === 'layout') {
      if (
        command.type !== 'expand' &&
        command.type !== 'collapse' &&
        command.type !== 'drillDown' &&
        command.type !== 'rollUp'
      ) {
        this.rebuild(false)
      }
      this.viewport = createPivotViewport(this.viewportContext())
    }

    this.emit()
    return this.state
  }

  /**
   * Apply an authoritative aggregated DataCfg (e.g. after parent fetch).
   * Prefer this over setDataCfg when only replacing cells for the same query.
   */
  applyAggregatedResult(partial: {
    data: PivotRecord[]
    totals?: PivotRecord[]
    subTotals?: AggregatedSubTotalRecord[]
    totalLabel?: string
    subTotalLabel?: string
    aggregate?: AggregatedDataCfg['aggregate']
    fieldValues?: AggregatedDataCfg['fieldValues']
    meta?: AggregatedDataCfg['meta']
  }): void {
    const prev = this.state.dataCfg
    const fields = prev.fields
    const aggregate =
      partial.aggregate ??
      (isAggregatedDataCfg(prev) ? prev.aggregate : { shape: 'wide' as const })

    const nextCfg: AggregatedDataCfg = {
      dataKind: 'aggregated',
      fields,
      meta: partial.meta ?? prev.meta,
      data: partial.data,
      totals: partial.totals,
      subTotals: partial.subTotals,
      totalLabel:
        partial.totalLabel ?? (isAggregatedDataCfg(prev) ? prev.totalLabel : undefined),
      subTotalLabel:
        partial.subTotalLabel ?? (isAggregatedDataCfg(prev) ? prev.subTotalLabel : undefined),
      aggregate,
      fieldValues:
        partial.fieldValues ?? (isAggregatedDataCfg(prev) ? prev.fieldValues : undefined),
    }
    this.dispatch({ type: 'setDataCfg', dataCfg: nextCfg })
  }

  async refreshFromDataSource(): Promise<void> {
    const query = buildPivotQuery(this.state)
    this.state = {
      ...this.state,
      status: 'loading',
      loadingQueryId: query.queryId,
      error: null,
      version: this.state.version + 1,
    }
    this.emit()

    try {
      const result = await this.queryController.run(query.queryId, async (signal) => {
        if (this.useWorker && this.workerExecutor) {
          if (query.dataKind === 'aggregated') {
            throw new Error('[vue-pivot] useWorker is incompatible with dataKind: "aggregated"')
          }
          const req = createWorkerRequest(query, this.state.dataCfg.data ?? [])
          return this.workerExecutor.execute(req, signal)
        }
        return this.dataSource.query(query, signal)
      })
      if (!result) return
      this.applyPivotResult(result, query)
      this.rebuild(true)
      this.viewport = createPivotViewport(this.viewportContext())
      if (this.state.status !== 'error') {
        this.state = {
          ...this.state,
          status: 'success',
          loadingQueryId: null,
          // Bump version so Vue adapters (usePivotTable) invalidate cached viewport
          version: this.state.version + 1,
        }
      } else {
        this.state = {
          ...this.state,
          loadingQueryId: null,
          version: this.state.version + 1,
        }
      }
      this.emit()
    } catch (err) {
      this.state = {
        ...this.state,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
        loadingQueryId: null,
        version: this.state.version + 1,
      }
      this.emit()
    }
  }

  private applyPivotResult(result: PivotResult, query: PivotQuery): void {
    if (query.dataKind === 'aggregated') {
      const records = result.records ?? []
      const prev = this.state.dataCfg
      const aggregate =
        result.aggregate ??
        (isAggregatedDataCfg(prev) ? prev.aggregate : { shape: 'wide' as const })
      const nextCfg: AggregatedDataCfg = {
        dataKind: 'aggregated',
        fields: prev.fields,
        meta: prev.meta,
        data: records,
        totals: result.totals,
        subTotals: result.subTotals,
        totalLabel: isAggregatedDataCfg(prev) ? prev.totalLabel : undefined,
        subTotalLabel: isAggregatedDataCfg(prev) ? prev.subTotalLabel : undefined,
        aggregate,
        fieldValues: result.fieldValues ?? (isAggregatedDataCfg(prev) ? prev.fieldValues : undefined),
      }
      this.state = {
        ...this.state,
        dataCfg: nextCfg,
        records,
      }
      return
    }

    if (result.records) {
      this.state = {
        ...this.state,
        dataCfg: {
          ...this.state.dataCfg,
          dataKind: 'raw',
          data: result.records,
        },
        records: result.records,
      }
    }
  }

  setDataSource(ds: PivotDataSource): void {
    this.dataSource = ds
  }

  dispose(): void {
    this.queryController.cancel()
    this.workerExecutor?.dispose()
    this.listeners.clear()
    this.queryListeners.clear()
  }
}

export function createPivotEngine(opts?: PivotEngineOptions): PivotEngine {
  return new PivotEngine(opts)
}
