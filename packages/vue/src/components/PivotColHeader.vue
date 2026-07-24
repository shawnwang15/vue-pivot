<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { ColumnLayout } from '@vue-pivot/core'

export interface HeaderCell {
  id: string
  label: string
  colSpan: number
  startIndex: number
  depth: number
}

const props = defineProps<{
  headerLevels: HeaderCell[][]
  columns: ColumnLayout[]
  scrollLeft: number
  totalWidth: number
  rowHeight: number
  colStart: number
  resizeEnabled?: boolean
}>()

const emit = defineEmits<{
  brush: [payload: { startCol: number; endCol: number }]
  resize: [payload: { columnId: string; width: number }]
}>()

const MIN_WIDTH = 40
const MAX_WIDTH = 800

const offsetStyle = computed(() => ({
  transform: `translateX(${-props.scrollLeft}px)`,
  width: `${props.totalWidth}px`,
}))

/** id of the rightmost leaf column covered by a header cell (group-aware). */
function leafColumnId(cell: HeaderCell): string | null {
  const col = props.columns[cell.startIndex + cell.colSpan - 1]
  return col?.columnId ?? null
}

const resizing = ref<{ columnId: string; startX: number; startWidth: number } | null>(null)
let pendingWidth = 0
let rafId = 0

function onResizeStart(e: MouseEvent, cell: HeaderCell) {
  if (!props.resizeEnabled) return
  const columnId = leafColumnId(cell)
  if (!columnId) return
  e.preventDefault()
  e.stopPropagation() // avoid triggering column brush selection
  const col = props.columns[cell.startIndex + cell.colSpan - 1]!
  resizing.value = { columnId, startX: e.clientX, startWidth: col.width }
  pendingWidth = col.width
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(e: MouseEvent) {
  if (!resizing.value) return
  const dx = e.clientX - resizing.value.startX
  const width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizing.value.startWidth + dx))
  if (width === pendingWidth) return
  pendingWidth = width
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    if (resizing.value) emit('resize', { columnId: resizing.value.columnId, width: pendingWidth })
  })
}

function onResizeEnd() {
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeEnd)
  cancelAnimationFrame(rafId)
  if (resizing.value && pendingWidth) {
    emit('resize', { columnId: resizing.value.columnId, width: pendingWidth })
  }
  resizing.value = null
  pendingWidth = 0
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeEnd)
  cancelAnimationFrame(rafId)
})

let brushStart: number | null = null

const onMouseDown = (colIndex: number) => {
  brushStart = colIndex
}

const onMouseUp = (colIndex: number) => {
  if (brushStart == null) return
  emit('brush', { startCol: brushStart, endCol: colIndex })
  brushStart = null
}
</script>

<template>
  <div class="vp-col-header" role="rowgroup">
    <div :style="offsetStyle">
      <div
        v-for="(level, li) in headerLevels"
        :key="li"
        class="vp-col-header-row"
        role="row"
        :style="{ display: 'flex', height: `${rowHeight}px` }"
      >
        <div
          v-for="cell in level"
          :key="cell.id + cell.startIndex"
          class="vp-header-cell"
          role="columnheader"
          :style="{
            width: `${columns
              .slice(cell.startIndex, cell.startIndex + cell.colSpan)
              .reduce((a, c) => a + c.width, 0)}px`,
            flex: '0 0 auto',
          }"
          @mousedown="onMouseDown(cell.startIndex)"
          @mouseup="onMouseUp(cell.startIndex + cell.colSpan - 1)"
        >
          <slot name="col-cell" :cell="cell">
            {{ cell.label }}
          </slot>
          <!-- Resize handle: only on the deepest level so every column divider gets exactly one -->
          <div
            v-if="resizeEnabled && li === headerLevels.length - 1"
            class="vp-col-resizer"
            :class="{ 'is-active': resizing?.columnId === leafColumnId(cell) }"
            @mousedown="onResizeStart($event, cell)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
