<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DataCfg, PivotCommand, PivotOptions, SelectionRange } from '@vue-pivot/core'
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
import '../styles/tokens.css'

const props = withDefaults(
  defineProps<{
    dataCfg: DataCfg
    options?: PivotOptions
    showFieldPanel?: boolean
  }>(),
  {
    options: () => ({}),
    showFieldPanel: false,
  },
)

const emit = defineEmits<{
  brushSelection: [selection: SelectionRange[]]
  command: [cmd: PivotCommand]
}>()

const { engine, state, dispatch, viewport, selection, adapter } = usePivotSheet({
  dataCfg: props.dataCfg,
  options: props.options,
})

watch(
  () => props.dataCfg,
  (cfg) => dispatch({ type: 'setDataCfg', dataCfg: cfg }),
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

defineExpose({
  engine,
  dispatch,
  state,
  viewport,
  selection,
})
</script>

<template>
  <div>
    <PivotFieldPanel
      v-if="showFieldPanel"
      :data-cfg="state.dataCfg"
      @command="onFieldCommand"
    />
    <div
      class="vp-sheet"
      role="grid"
      :aria-rowcount="rowCount"
      :aria-colcount="columnCount"
      tabindex="0"
      @keydown="onKeydown"
    >
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
