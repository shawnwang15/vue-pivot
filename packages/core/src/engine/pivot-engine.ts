import type { DataCfg } from '../types/data-cfg'
import type { PivotOptions } from '../types/options'
import type { PivotCommand } from '../types/pivot-command'
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
import { normalizeMeasures } from '../types/data-cfg'

export type PivotListener = (state: PivotState) => void

export interface PivotEngineOptions {
  dataCfg?: DataCfg
  options?: PivotOptions
  dataSource?: PivotDataSource
  useWorker?: boolean
  workerUrl?: string | URL
}

export class PivotEngine {
  private state: PivotState
  private listeners = new Set<PivotListener>()
  private viewport: PivotViewport
  private dataSource: PivotDataSource
  private queryController: QueryController
  private workerExecutor: WorkerExecutor | null
  private useWorker: boolean

  constructor(opts: PivotEngineOptions = {}) {
    this.state = createInitialState(opts.dataCfg, opts.options)
    this.dataSource = opts.dataSource ?? new LocalDataSource(this.state.records)
    this.queryController = createQueryController()
    this.useWorker = Boolean(opts.useWorker)
    this.workerExecutor = opts.useWorker ? new WorkerExecutor(opts.workerUrl) : null
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

  private emit(): void {
    for (const l of this.listeners) l(this.state)
  }

  private viewportContext(): ViewportContext {
    return {
      rowTree: this.state.rowTree,
      colTree: this.state.colTree,
      cube: this.state.cube,
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
      postFilters: this.state.filters.filter((f) => f.postAggregation),
    }
  }

  private rebuild(full: boolean): void {
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
      if (this.state.dataCfg.preAggregated?.length) {
        ingestPreAggregated(
          cube,
          rowTree,
          colTree,
          this.state.dataCfg.preAggregated,
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
      measures: normalizeMeasures(this.state.dataCfg.fields.values ?? []),
      status: 'success',
      error: null,
    }
  }

  dispatch(command: PivotCommand): PivotState {
    const { state, invalidate } = reducePivotState(this.state, command)
    this.state = state

    if (invalidate === 'all') {
      this.rebuild(true)
      this.viewport = createPivotViewport(this.viewportContext())
    } else if (invalidate === 'cube') {
      invalidateCube(this.state.cube, 'all')
      this.viewport = createPivotViewport(this.viewportContext())
    } else if (invalidate === 'layout') {
      // trees already mutated for expand/collapse
      if (command.type !== 'expand' && command.type !== 'collapse' && command.type !== 'drillDown' && command.type !== 'rollUp') {
        this.rebuild(false)
      }
      this.viewport = createPivotViewport(this.viewportContext())
    }

    this.emit()
    return this.state
  }

  async refreshFromDataSource(): Promise<void> {
    const query = buildPivotQuery(this.state)
    this.state = {
      ...this.state,
      status: 'loading',
      loadingQueryId: query.queryId,
      error: null,
    }
    this.emit()

    try {
      const result = await this.queryController.run(query.queryId, async (signal) => {
        if (this.useWorker && this.workerExecutor) {
          const req = createWorkerRequest(query, this.state.dataCfg.data ?? [])
          return this.workerExecutor.execute(req, signal)
        }
        return this.dataSource.query(query, signal)
      })
      if (!result) return
      if (result.records) {
        this.state = {
          ...this.state,
          dataCfg: { ...this.state.dataCfg, data: result.records },
          records: result.records,
        }
      }
      this.rebuild(true)
      this.viewport = createPivotViewport(this.viewportContext())
      this.state = { ...this.state, status: 'success', loadingQueryId: null }
      this.emit()
    } catch (err) {
      this.state = {
        ...this.state,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
        loadingQueryId: null,
      }
      this.emit()
    }
  }

  setDataSource(ds: PivotDataSource): void {
    this.dataSource = ds
  }

  dispose(): void {
    this.queryController.cancel()
    this.workerExecutor?.dispose()
    this.listeners.clear()
  }
}

export function createPivotEngine(opts?: PivotEngineOptions): PivotEngine {
  return new PivotEngine(opts)
}
