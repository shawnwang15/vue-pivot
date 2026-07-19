<script setup lang="ts">
import { ref, type CSSProperties } from 'vue'
import type { ColumnLayout, ConditionsOptions, PivotCell, RowLayout, SelectionRange } from '@vue-pivot/core'
import { mapConditions } from '../interaction/conditions'

const root = ref<HTMLElement | null>(null)
defineExpose({ el: root })

const props = defineProps<{
  rows: RowLayout[]
  columns: ColumnLayout[]
  getCell: (rowIndex: number, colIndex: number) => PivotCell
  virtualRows: Array<{ index: number; start: number; size: number }>
  virtualCols: Array<{ index: number; start: number; size: number }>
  totalWidth: number
  totalHeight: number
  rowHeight: number
  selection: SelectionRange[]
  conditions?: ConditionsOptions
  focusRow: number
  focusCol: number
  nonVirtual?: boolean
}>()

const emit = defineEmits<{
  scroll: [e: Event]
  cellMouseDown: [payload: { row: number; col: number; event: MouseEvent }]
  cellMouseEnter: [payload: { row: number; col: number; event: MouseEvent }]
  cellMouseUp: [payload: { row: number; col: number; event: MouseEvent }]
}>()

function isSelected(row: number, col: number): boolean {
  return props.selection.some(
    (s) =>
      row >= Math.min(s.start.rowIndex, s.end.rowIndex) &&
      row <= Math.max(s.start.rowIndex, s.end.rowIndex) &&
      col >= Math.min(s.start.colIndex, s.end.colIndex) &&
      col <= Math.max(s.start.colIndex, s.end.colIndex),
  )
}

function rowItems() {
  if (props.nonVirtual) {
    return props.rows.map((_, index) => ({
      index,
      start: index * props.rowHeight,
      size: props.rowHeight,
    }))
  }
  return props.virtualRows
}

function colItems() {
  if (props.nonVirtual) {
    let start = 0
    return props.columns.map((c, index) => {
      const item = { index, start, size: c.width }
      start += c.width
      return item
    })
  }
  return props.virtualCols
}

function cellStyle(vr: { start: number }, vc: { start: number; size: number }, cell: PivotCell): CSSProperties {
  const cond = mapConditions(cell, props.conditions)
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: `translate(${vc.start}px, ${vr.start}px)`,
    width: `${vc.size}px`,
    height: `${props.rowHeight}px`,
    color: cond.color as string | undefined,
    background: cond.background as string | undefined,
  }
}
</script>

<template>
  <div ref="root" class="vp-data-grid" @scroll="emit('scroll', $event)">
    <div
      class="vp-data-canvas"
      :style="{ width: `${totalWidth}px`, height: `${totalHeight}px`, position: 'relative' }"
    >
      <template v-for="vr in rowItems()" :key="`r-${vr.index}`">
        <div
          v-for="vc in colItems()"
          :key="`${vr.index}:${vc.index}`"
          class="vp-cell"
          :class="{
            'is-total': getCell(vr.index, vc.index).type === 'total',
            'is-selected': isSelected(vr.index, vc.index),
          }"
          role="gridcell"
          :tabindex="focusRow === vr.index && focusCol === vc.index ? 0 : -1"
          :aria-rowindex="vr.index + 1"
          :aria-colindex="vc.index + 1"
          :style="cellStyle(vr, vc, getCell(vr.index, vc.index))"
          @mousedown="emit('cellMouseDown', { row: vr.index, col: vc.index, event: $event })"
          @mouseenter="emit('cellMouseEnter', { row: vr.index, col: vc.index, event: $event })"
          @mouseup="emit('cellMouseUp', { row: vr.index, col: vc.index, event: $event })"
        >
          <div
            v-if="mapConditions(getCell(vr.index, vc.index), conditions).interval"
            class="vp-interval"
          >
            <i
              :style="{
                width: `${(mapConditions(getCell(vr.index, vc.index), conditions).interval?.ratio ?? 0) * 100}%`,
              }"
            />
          </div>
          <slot
            name="data-cell"
            :cell="getCell(vr.index, vc.index)"
            :row="rows[vr.index]"
            :column="columns[vc.index]"
          >
            {{ getCell(vr.index, vc.index).formatted }}
          </slot>
        </div>
      </template>
    </div>
  </div>
</template>
