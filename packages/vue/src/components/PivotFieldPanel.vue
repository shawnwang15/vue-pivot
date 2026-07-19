<script setup lang="ts">
import { computed } from 'vue'
import type { DataCfg, FieldZone, PivotCommand } from '@vue-pivot/core'

const props = defineProps<{
  dataCfg: DataCfg
}>()

const emit = defineEmits<{
  command: [cmd: PivotCommand]
}>()

const zones = computed(() => {
  const f = props.dataCfg.fields
  return {
    rows: f.rows ?? [],
    columns: f.columns ?? [],
    values: (f.values ?? []).map((v) => (typeof v === 'string' ? v : v.field)),
    filters: f.filters ?? [],
  }
})

let dragField: string | null = null
let dragFrom: FieldZone | null = null

const onDragStart = (field: string, from: FieldZone) => {
  dragField = field
  dragFrom = from
}

const onDrop = (to: FieldZone) => {
  if (!dragField || !dragFrom || dragFrom === to) return
  emit('command', { type: 'moveField', from: dragFrom, to, field: dragField })
  dragField = null
  dragFrom = null
}
</script>

<template>
  <div class="vp-field-panel" aria-label="Field panel">
    <div
      v-for="zone in (['rows', 'columns', 'values', 'filters'] as FieldZone[])"
      :key="zone"
      class="vp-field-zone"
      @dragover.prevent
      @drop="onDrop(zone)"
    >
      <strong>{{ zone }}</strong>
      <div
        v-for="field in zones[zone]"
        :key="field"
        class="vp-field-chip"
        draggable="true"
        @dragstart="onDragStart(field, zone)"
      >
        {{ field }}
      </div>
    </div>
  </div>
</template>
