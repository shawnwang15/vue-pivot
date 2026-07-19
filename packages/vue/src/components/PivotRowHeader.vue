<script setup lang="ts">
import { computed } from 'vue'
import type { HierarchyType, RowLayout } from '@vue-pivot/core'

const props = defineProps<{
  rows: RowLayout[]
  scrollTop: number
  totalHeight: number
  rowHeight: number
  hierarchyType: HierarchyType
  virtualRows: Array<{ index: number; start: number; size: number }>
}>()

const emit = defineEmits<{
  toggle: [payload: { path: string[]; expanded: boolean }]
}>()

const offsetStyle = computed(() => ({
  height: `${props.totalHeight}px`,
  position: 'relative' as const,
}))
</script>

<template>
  <div class="vp-row-header" role="rowgroup">
    <div :style="offsetStyle">
      <div
        v-for="vr in virtualRows"
        :key="rows[vr.index]?.nodeId ?? vr.index"
        class="vp-cell vp-row-cell"
        role="rowheader"
        :class="{ 'is-total': rows[vr.index]?.kind !== 'dimension' }"
        :style="{
          position: 'absolute',
          top: 0,
          transform: `translateY(${vr.start - scrollTop}px)`,
          width: '100%',
          height: `${rowHeight}px`,
          '--vp-depth': String(rows[vr.index]?.depth ?? 0),
        }"
      >
        <button
          v-if="hierarchyType !== 'grid' && rows[vr.index] && !rows[vr.index]!.isLeaf"
          type="button"
          class="vp-expand-btn"
          :aria-expanded="rows[vr.index]!.expanded"
          @click="
            emit('toggle', {
              path: rows[vr.index]!.path,
              expanded: !rows[vr.index]!.expanded,
            })
          "
        >
          {{ rows[vr.index]!.expanded ? '▾' : '▸' }}
        </button>
        <slot name="row-cell" :row="rows[vr.index]">
          {{ rows[vr.index]?.label }}
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vp-expand-btn {
  border: 0;
  background: transparent;
  cursor: pointer;
  margin-right: 4px;
  color: var(--vp-text-muted);
}
</style>
