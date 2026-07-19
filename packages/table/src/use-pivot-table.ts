import {
  getCoreRowModel,
  useVueTable,
  type ColumnDef,
  type Table,
} from '@tanstack/vue-table'
import { computed, shallowRef, watch, type Ref } from 'vue'
import type { PivotEngine, PivotViewport } from '@vue-pivot/core'
import {
  buildNestedColumnDefs,
  buildRowData,
  projectHeaderGroups,
  type PivotRowData,
} from './column-def-builder'
import { applyManualStateChange, readManualState, type ManualTableState } from './manual-state-adapter'

export interface UsePivotTableResult {
  table: Table<PivotRowData>
  rows: Ref<PivotRowData[]>
  columns: Ref<ColumnDef<PivotRowData, unknown>[]>
  manualState: Ref<ManualTableState>
  viewport: Ref<PivotViewport>
  headerProjection: (
    colStart: number,
    colEnd: number,
  ) => ReturnType<typeof projectHeaderGroups>
  assertRowWindowConsistency: (rowIds: number[]) => void
}

export function usePivotTable(engine: PivotEngine): UsePivotTableResult {
  const version = shallowRef(engine.getState().version)
  engine.subscribe((s) => {
    version.value = s.version
  })

  const viewport = computed(() => {
    void version.value
    return engine.getViewport()
  })

  const rows = computed(() => {
    void version.value
    return buildRowData(engine)
  })

  const columns = computed(() => {
    void version.value
    return buildNestedColumnDefs(engine.getViewport())
  })

  const manualState = computed(() => {
    void version.value
    return readManualState(engine)
  })

  const table = useVueTable({
    get data() {
      return rows.value
    },
    get columns() {
      return columns.value
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
    enableColumnPinning: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: {
      get sorting() {
        return manualState.value.sorting
      },
      get columnVisibility() {
        return manualState.value.columnVisibility
      },
      get columnOrder() {
        return manualState.value.columnOrder
      },
      get columnSizing() {
        return manualState.value.columnSizing
      },
      get columnPinning() {
        return manualState.value.columnPinning
      },
    },
    onSortingChange: (updater) => {
      const prev = manualState.value.sorting
      const next = typeof updater === 'function' ? updater(prev) : updater
      applyManualStateChange(engine, { sorting: next })
    },
    onColumnVisibilityChange: (updater) => {
      const prev = manualState.value.columnVisibility
      const next = typeof updater === 'function' ? updater(prev) : updater
      applyManualStateChange(engine, { columnVisibility: next })
    },
    onColumnSizingChange: (updater) => {
      const prev = manualState.value.columnSizing
      const next = typeof updater === 'function' ? updater(prev) : updater
      applyManualStateChange(engine, { columnSizing: next })
    },
    onColumnOrderChange: (updater) => {
      const prev = manualState.value.columnOrder
      const next = typeof updater === 'function' ? updater(prev) : updater
      applyManualStateChange(engine, { columnOrder: next })
    },
    onColumnPinningChange: (updater) => {
      const prev = manualState.value.columnPinning
      const next = typeof updater === 'function' ? updater(prev) : updater
      applyManualStateChange(engine, { columnPinning: next })
    },
    // Explicitly NOT using getGroupedRowModel / getExpandedRowModel for pivot semantics
  })

  watch(
    () => engine.getState().version,
    () => {
      // keep table model in sync via computed getters
    },
  )

  const assertRowWindowConsistency = (rowIds: number[]) => {
    const visible = engine.getViewport().getRows().map((r) => r.nodeId)
    for (let i = 0; i < Math.min(rowIds.length, visible.length); i++) {
      if (rowIds[i] !== visible[i]) {
        console.warn('[vue-pivot] row header / data window mismatch', { rowIds, visible })
        break
      }
    }
  }

  return {
    table,
    rows,
    columns,
    manualState,
    viewport,
    headerProjection: (colStart, colEnd) =>
      projectHeaderGroups(engine.getViewport().getColumns(), colStart, colEnd),
    assertRowWindowConsistency,
  }
}
