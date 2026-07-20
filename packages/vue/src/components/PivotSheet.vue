<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  DataCfg,
  PivotCommand,
  PivotDataSource,
  PivotOptions,
  PivotQuery,
  SelectionRange,
} from '@vue-pivot/core'
import { projectHeaderGroups } from '@vue-pivot/table'
import { usePivotSheet } from '../composables/use-pivot-sheet'
import { useGridVirtualizer } from '../composables/use-grid-virtualizer'
import { useKeyboardNav } from '../composables/use-keyboard-nav'
import PivotCorner from './PivotCorner.vue'
import PivotColHeader from './PivotColHeader.vue'
import PivotRowHeader from './PivotRowHeader.vue'
import PivotDataGrid from './PivotDataGrid.vue'
import PivotTooltip from './PivotTooltip.vue'
import PivotFieldPanel from './PivotFieldPanel.vue'
import PivotFilterBar from './PivotFilterBar.vue'
import '../styles/tokens.css'

const props = withDefaults(
  defineProps<{
    dataCfg: DataCfg
    options?: PivotOptions
    showFieldPanel?: boolean
    dataSource?: PivotDataSource
    autoFetch?: boolean
    /** Facet members for filter UI (aggregated mode) */
    filterFacets?: Record<string, unknown[]>
  }>(),
  {
    options: () => ({}),
    showFieldPanel: false,
    autoFetch: true,
  },
)

const emit = defineEmits<{
  brushSelection: [selection: SelectionRange[]]
  command: [cmd: PivotCommand]
  queryChange: [query: PivotQuery]
  fetchError: [payload: { error: string; queryId?: string | null }]
}>()

const { engine, state, dispatch, viewport, selection, adapter, loading, error, status, refresh } =
  usePivotSheet({
    dataCfg: props.dataCfg,
    options: props.options,
    dataSource: props.dataSource,
    autoFetch: props.autoFetch,
    onQueryChange: (query) => emit('queryChange', query),
  })

watch(
  () => props.dataCfg,
  (cfg) => {
    // Avoid clobbering in-panel moveField/filter edits with a stale parent object.
    if (cfg === state.value.dataCfg) return
    dispatch({ type: 'setDataCfg', dataCfg: cfg })
  },
  { deep: true },
)
watch(
  () => props.options,
  (options) => dispatch({ type: 'setOptions', options: options ?? {} }),
  { deep: true },
)

const scrollEl = ref<HTMLElement | null>(null)
const rowHeight = computed(() => props.options?.style?.rowHeight ?? 32)
const hierarchyType = computed(() => state.value.options.hierarchyType ?? 'grid')

const rowCount = computed(() => viewport.value.rowCount)
const columnCount = computed(() => viewport.value.columnCount)

const grid = useGridVirtualizer({
  scrollElement: scrollEl,
  rowCount,
  columnCount,
  rowHeight: rowHeight.value,
  getColumnWidth: (i) => viewport.value.getColumn(i)?.width ?? 120,
  overscan: 4,
})

// bind scroll element from data grid root
watch(
  () => scrollEl.value,
  () => {
    /* virtualizer reads via getter */
  },
)

const headerLevels = computed(() => {
  const cols = viewport.value.getColumns()
  const { start, end } = grid.visibleColRange.value
  return projectHeaderGroups(cols, start, Math.max(end, start))
})

const headerHeight = computed(() => Math.max(1, headerLevels.value.length) * rowHeight.value)

const virtualRows = computed(() => {
  const items = grid.rowVirtualizer.value.getVirtualItems()
  if (items.length) {
    return items.map((i) => ({ index: i.index, start: i.start, size: i.size }))
  }
  // Fallback before scroll element measurement settles
  const h = rowHeight.value
  const count = Math.min(rowCount.value, 24)
  return Array.from({ length: count }, (_, index) => ({
    index,
    start: index * h,
    size: h,
  }))
})
const virtualCols = computed(() => {
  const items = grid.colVirtualizer.value.getVirtualItems()
  if (items.length) {
    return items.map((i) => ({ index: i.index, start: i.start, size: i.size }))
  }
  const cols = viewport.value.getColumns()
  let start = 0
  return cols.slice(0, Math.min(cols.length, 16)).map((c, index) => {
    const item = { index, start, size: c.width }
    start += c.width
    return item
  })
})

const nonVirtual = computed(() => rowCount.value * columnCount.value <= 400)

const { focusRow, focusCol, onKeydown } = useKeyboardNav({
  rowCount,
  colCount: columnCount,
  dispatch,
  scrollToCell: (row, col) => {
    grid.rowVirtualizer.value.scrollToIndex(row)
    grid.colVirtualizer.value.scrollToIndex(col)
  },
  nonVirtual,
})

let brushing = false
let brushStart: { row: number; col: number } | null = null

const onCellMouseDown = ({ row, col }: { row: number; col: number }) => {
  if (!state.value.options.interaction?.brushSelection) {
    dispatch({
      type: 'setSelection',
      selection: [{ start: { rowIndex: row, colIndex: col }, end: { rowIndex: row, colIndex: col } }],
    })
    return
  }
  brushing = true
  brushStart = { row, col }
}

const onCellMouseEnter = ({ row, col }: { row: number; col: number }) => {
  if (!brushing || !brushStart) return
  dispatch({
    type: 'brushSelect',
    range: {
      start: { rowIndex: brushStart.row, colIndex: brushStart.col },
      end: { rowIndex: row, colIndex: col },
      kind: 'brush',
    },
  })
}

const onCellMouseUp = () => {
  brushing = false
  brushStart = null
  emit('brushSelection', selection.value)
}

const onToggle = ({ path, expanded }: { path: string[]; expanded: boolean }) => {
  const cmd: PivotCommand = expanded
    ? { type: 'expand', axis: 'row', path }
    : { type: 'collapse', axis: 'row', path }
  dispatch(cmd)
  emit('command', cmd)
}

const onFieldCommand = (cmd: PivotCommand) => {
  dispatch(cmd)
  emit('command', cmd)
}

const fieldPanelOpen = ref(false)
const filterBarOpen = ref(false)

const hasFilterFields = computed(() => (state.value.dataCfg.fields.filters?.length ?? 0) > 0)

watch(hasFilterFields, (has) => {
  if (!has) filterBarOpen.value = false
})

const toggleFieldPanel = () => {
  fieldPanelOpen.value = !fieldPanelOpen.value
}

const toggleFilterBar = () => {
  filterBarOpen.value = !filterBarOpen.value
}

const tooltip = ref({ visible: false, x: 0, y: 0, text: '' })

const onScroll = (e: Event) => {
  grid.onScroll(e)
  adapter.assertRowWindowConsistency(
    viewport.value.getRows().slice(grid.visibleRowRange.value.start, grid.visibleRowRange.value.end).map((r) => r.nodeId),
  )
}

const setScrollEl = (comp: unknown) => {
  if (!comp) {
    scrollEl.value = null
    return
  }
  if (comp instanceof HTMLElement) {
    scrollEl.value = comp
    return
  }
  const c = comp as { el?: HTMLElement | { value?: HTMLElement | null } | null; $el?: HTMLElement }
  const exposed = c.el
  if (exposed instanceof HTMLElement) {
    scrollEl.value = exposed
    return
  }
  if (exposed && typeof exposed === 'object' && 'value' in exposed) {
    scrollEl.value = exposed.value ?? null
    return
  }
  scrollEl.value = c.$el ?? null
}

watch(
  () => state.value.status,
  (s) => {
    if (s === 'error' && state.value.error) {
      emit('fetchError', { error: state.value.error, queryId: state.value.loadingQueryId })
    }
  },
)

defineExpose({
  engine,
  dispatch,
  state,
  viewport,
  selection,
  refresh,
  loading,
  error,
  status,
})
</script>

<template>
  <div class="vp-sheet-root">
    <div v-if="showFieldPanel" class="vp-field-toolbar">
      <div v-if="hasFilterFields" class="vp-field-toolbar-filter">
        <button
          type="button"
          class="vp-field-config-btn"
          :class="{ 'is-active': filterBarOpen }"
          aria-label="过滤"
          :aria-expanded="filterBarOpen"
          @click="toggleFilterBar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 5h16l-6.5 7.5V19l-3 1.5v-8L4 5Z" />
          </svg>
        </button>
        <PivotFilterBar
          v-if="filterBarOpen"
          :data-cfg="state.dataCfg"
          :fields="state.dataCfg.fields.filters ?? []"
          :active-filters="state.filters"
          :facets="filterFacets"
          @command="onFieldCommand"
        />
      </div>
      <button
        type="button"
        class="vp-field-config-btn"
        aria-label="配置字段"
        :aria-expanded="fieldPanelOpen"
        @click="toggleFieldPanel"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z"
          />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </button>
    </div>
    <PivotFieldPanel
      v-if="showFieldPanel && fieldPanelOpen"
      :data-cfg="state.dataCfg"
      @command="onFieldCommand"
    />
    <div
      v-if="status === 'error' && error"
      class="vp-sheet-error"
      role="alert"
    >
      <span>{{ error }}</span>
      <button type="button" class="vp-sheet-error-retry" @click="refresh()">重试</button>
    </div>
    <div
      class="vp-sheet"
      :class="{ 'is-loading': loading || status === 'stale' }"
      role="grid"
      :aria-busy="loading || undefined"
      :aria-rowcount="rowCount"
      :aria-colcount="columnCount"
      tabindex="0"
      @keydown="onKeydown"
    >
      <div v-if="loading" class="vp-sheet-loading" aria-live="polite">加载中…</div>
      <PivotCorner :height="headerHeight" label="Fields">
        <template #corner-cell>
          <slot name="corner-cell" />
        </template>
      </PivotCorner>

      <PivotColHeader
        :header-levels="headerLevels"
        :columns="viewport.getColumns()"
        :scroll-left="grid.scrollLeft.value"
        :total-width="grid.totalWidth.value"
        :row-height="rowHeight"
        :col-start="grid.visibleColRange.value.start"
      >
        <template #col-cell="slotProps">
          <slot name="col-cell" v-bind="slotProps" />
        </template>
      </PivotColHeader>

      <PivotRowHeader
        :rows="viewport.getRows()"
        :scroll-top="grid.scrollTop.value"
        :total-height="grid.totalHeight.value"
        :row-height="rowHeight"
        :hierarchy-type="hierarchyType"
        :virtual-rows="virtualRows"
        @toggle="onToggle"
      >
        <template #row-cell="slotProps">
          <slot name="row-cell" v-bind="slotProps" />
        </template>
      </PivotRowHeader>

      <PivotDataGrid
        :ref="setScrollEl"
        :rows="viewport.getRows()"
        :columns="viewport.getColumns()"
        :get-cell="(r, c) => viewport.getCell(r, c)"
        :virtual-rows="virtualRows"
        :virtual-cols="virtualCols"
        :total-width="grid.totalWidth.value"
        :total-height="grid.totalHeight.value"
        :row-height="rowHeight"
        :selection="selection"
        :conditions="state.options.conditions"
        :focus-row="focusRow"
        :focus-col="focusCol"
        :non-virtual="nonVirtual"
        @scroll="onScroll"
        @cell-mouse-down="onCellMouseDown"
        @cell-mouse-enter="onCellMouseEnter"
        @cell-mouse-up="onCellMouseUp"
      >
        <template #data-cell="slotProps">
          <slot name="data-cell" v-bind="slotProps" />
        </template>
      </PivotDataGrid>
    </div>
    <PivotTooltip
      :visible="tooltip.visible"
      :x="tooltip.x"
      :y="tooltip.y"
      :text="tooltip.text"
    />
  </div>
</template>
