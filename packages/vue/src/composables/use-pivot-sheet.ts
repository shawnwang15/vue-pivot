import { computed, onUnmounted, shallowRef, type Ref } from 'vue'
import {
  createPivotEngine,
  type DataCfg,
  type PivotCommand,
  type PivotEngine,
  type PivotOptions,
  type PivotState,
  type PivotViewport,
  type SelectionRange,
} from '@vue-pivot/core'
import { usePivotTable, type UsePivotTableResult } from '@vue-pivot/table'

export interface UsePivotSheetOptions {
  dataCfg: DataCfg
  options?: PivotOptions
  engine?: PivotEngine
}

export interface UsePivotSheetResult {
  engine: PivotEngine
  state: Ref<PivotState>
  dispatch: (command: PivotCommand) => void
  table: UsePivotTableResult['table']
  viewport: Ref<PivotViewport>
  selection: Ref<SelectionRange[]>
  adapter: UsePivotTableResult
}

export function usePivotSheet(opts: UsePivotSheetOptions): UsePivotSheetResult {
  const engine = opts.engine ?? createPivotEngine({ dataCfg: opts.dataCfg, options: opts.options })
  const state = shallowRef(engine.getState())
  const unsub = engine.subscribe((s) => {
    state.value = s
  })
  onUnmounted(() => {
    unsub()
  })

  const adapter = usePivotTable(engine)
  const selection = computed(() => state.value.selection)

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
  }
}
