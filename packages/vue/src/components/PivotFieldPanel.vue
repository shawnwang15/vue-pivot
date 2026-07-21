<script setup lang="ts">
import { computed } from 'vue'
import type { AggregatorId, DataCfg, FieldZone, MeasureField, PivotCommand } from '@vue-pivot/core'
import {
  getSheetType,
  listAggregators,
  listUnassignedFields,
  normalizeMeasures,
} from '@vue-pivot/core'

const props = defineProps<{
  dataCfg: DataCfg
}>()

const emit = defineEmits<{
  command: [cmd: PivotCommand]
}>()

const isTableSheet = computed(() => getSheetType(props.dataCfg) === 'table')
const occupiedZones = computed(() =>
  isTableSheet.value
    ? (['columns', 'filters'] as const)
    : (['rows', 'columns', 'values', 'filters'] as const),
)

const zones = computed(() => {
  const f = props.dataCfg.fields
  return {
    available: listUnassignedFields(props.dataCfg),
    rows: f.rows ?? [],
    columns: f.columns ?? [],
    values: normalizeMeasures(f.values ?? []),
    filters: f.filters ?? [],
  }
})

const aggregators = listAggregators() as AggregatorId[]

let dragField: string | null = null
let dragFrom: FieldZone | null = null

const onDragStart = (field: string, from: FieldZone) => {
  dragField = field
  dragFrom = from
}

const onDrop = (to: FieldZone) => {
  if (!dragField || !dragFrom || dragFrom === to) return
  if (isTableSheet.value && (to === 'rows' || to === 'values')) return
  emit('command', { type: 'moveField', from: dragFrom, to, field: dragField })
  dragField = null
  dragFrom = null
}

const onAggregationChange = (field: string, event: Event) => {
  const select = event.target as HTMLSelectElement
  emit('command', {
    type: 'setMeasureAggregation',
    field,
    aggregation: select.value as AggregatorId,
  })
}

const measureKey = (m: MeasureField) => m.field
</script>

<template>
  <div class="vp-field-panel" aria-label="Field panel">
    <div
      class="vp-field-zone vp-field-available"
      @dragover.prevent
      @drop="onDrop('available')"
    >
      <strong>available</strong>
      <div
        v-for="field in zones.available"
        :key="field"
        class="vp-field-chip"
        draggable="true"
        @dragstart="onDragStart(field, 'available')"
      >
        {{ field }}
      </div>
    </div>

    <div class="vp-field-zones" :class="{ 'is-table': isTableSheet }">
      <div
        v-for="zone in occupiedZones"
        :key="zone"
        class="vp-field-zone"
        @dragover.prevent
        @drop="onDrop(zone)"
      >
        <strong>{{ zone === 'columns' && isTableSheet ? 'columns (display)' : zone }}</strong>
        <template v-if="zone === 'values'">
          <div
            v-for="measure in zones.values"
            :key="measureKey(measure)"
            class="vp-field-chip vp-field-chip--measure"
            draggable="true"
            @dragstart="onDragStart(measure.field, 'values')"
          >
            <span>{{ measure.field }}</span>
            <select
              class="vp-field-agg"
              :value="measure.aggregation ?? 'sum'"
              aria-label="Aggregation"
              @mousedown.stop
              @click.stop
              @change="onAggregationChange(measure.field, $event)"
            >
              <option v-for="agg in aggregators" :key="agg" :value="agg">
                {{ agg }}
              </option>
            </select>
          </div>
        </template>
        <template v-else>
          <div
            v-for="field in zones[zone]"
            :key="field"
            class="vp-field-chip"
            draggable="true"
            @dragstart="onDragStart(field, zone)"
          >
            {{ field }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
