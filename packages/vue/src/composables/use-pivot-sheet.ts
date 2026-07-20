import { computed, onUnmounted, shallowRef, type Ref } from 'vue'
import {
  createPivotEngine,
  type DataCfg,
  type PivotCommand,
  type PivotDataSource,
  type PivotEngine,
  type PivotOptions,
  type PivotQuery,
  type PivotState,
  type PivotViewport,
  type QueryStatus,
  type SelectionRange,
} from '@vue-pivot/core'
import { usePivotTable, type UsePivotTableResult } from '@vue-pivot/table'

export interface UsePivotSheetOptions {
  dataCfg: DataCfg
  options?: PivotOptions
  engine?: PivotEngine
  dataSource?: PivotDataSource
  /** When true (default), query changes auto-refresh if dataSource is set */
  autoFetch?: boolean
  onQueryChange?: (query: PivotQuery) => void
}

export interface UsePivotSheetResult {
  engine: PivotEngine
  state: Ref<PivotState>
  dispatch: (command: PivotCommand) => void
  table: UsePivotTableResult['table']
  viewport: Ref<PivotViewport>
  selection: Ref<SelectionRange[]>
  adapter: UsePivotTableResult
  status: Ref<QueryStatus>
  error: Ref<string | null>
  loading: Ref<boolean>
  refresh: () => Promise<void>
}

export function usePivotSheet(opts: UsePivotSheetOptions): UsePivotSheetResult {
  const engine =
    opts.engine ??
    createPivotEngine({
      dataCfg: opts.dataCfg,
      options: opts.options,
      dataSource: opts.dataSource,
      autoFetch: opts.autoFetch,
    })

  if (opts.dataSource && opts.engine) {
    engine.setDataSource(opts.dataSource)
  }

  const state = shallowRef(engine.getState())
  const unsub = engine.subscribe((s) => {
    state.value = s
  })
  const unsubQuery = opts.onQueryChange ? engine.onQueryChange(opts.onQueryChange) : () => {}

  onUnmounted(() => {
    unsub()
    unsubQuery()
  })

  const adapter = usePivotTable(engine)
  const selection = computed(() => state.value.selection)
  const status = computed(() => state.value.status)
  const error = computed(() => state.value.error)
  const loading = computed(() => state.value.status === 'loading')

  return {
    engine,
    state,
    dispatch: (command) => {
      engine.dispatch(command)
    },
    table: adapter.table,
    viewport: adapter.viewport,
    selection,
    adapter,
    status,
    error,
    loading,
    refresh: () => engine.refreshFromDataSource(),
  }
}
