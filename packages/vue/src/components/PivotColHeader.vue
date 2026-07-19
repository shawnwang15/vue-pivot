<script setup lang="ts">
import { computed } from 'vue'
import type { ColumnLayout } from '@vue-pivot/core'

const props = defineProps<{
  headerLevels: Array<Array<{ id: string; label: string; colSpan: number; startIndex: number; depth: number }>>
  columns: ColumnLayout[]
  scrollLeft: number
  totalWidth: number
  rowHeight: number
  colStart: number
}>()

const emit = defineEmits<{
  brush: [payload: { startCol: number; endCol: number }]
  resize: [payload: { columnId: string; width: number }]
}>()

const offsetStyle = computed(() => ({
  transform: `translateX(${-props.scrollLeft}px)`,
  width: `${props.totalWidth}px`,
}))

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
        </div>
      </div>
    </div>
  </div>
</template>
