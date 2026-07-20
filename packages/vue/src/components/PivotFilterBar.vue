<script setup lang="ts">
import { ref } from 'vue'
import type { DataCfg, FilterSpec, PivotCommand } from '@vue-pivot/core'
import { listFieldValues } from '@vue-pivot/core'

const props = withDefaults(
  defineProps<{
    dataCfg: DataCfg
    fields: string[]
    activeFilters?: FilterSpec[]
    /** Optional server-provided facets; overrides dataCfg.fieldValues / data scan */
    facets?: Record<string, unknown[]>
  }>(),
  {
    activeFilters: () => [],
  },
)

const emit = defineEmits<{
  command: [cmd: PivotCommand]
}>()

const openFilterField = ref<string | null>(null)

const filterSpecFor = (field: string): FilterSpec | undefined =>
  props.activeFilters.find((f) => f.field === field && f.operator === 'in')

const valuesFor = (field: string): unknown[] => {
  if (props.facets?.[field]) return props.facets[field]!
  return listFieldValues(props.dataCfg, field)
}

const selectedValuesFor = (field: string): unknown[] => {
  const spec = filterSpecFor(field)
  const all = valuesFor(field)
  if (!spec || !Array.isArray(spec.value)) return all
  return spec.value as unknown[]
}

const filterSummary = (field: string): string => {
  const all = valuesFor(field)
  const selected = selectedValuesFor(field)
  if (selected.length === 0) return 'None'
  if (selected.length >= all.length) return 'All'
  if (selected.length === 1) return String(selected[0])
  return `${selected.length} selected`
}

const isValueSelected = (field: string, value: unknown): boolean =>
  selectedValuesFor(field).some((v) => Object.is(v, value))

const toggleFilterMenu = (field: string) => {
  openFilterField.value = openFilterField.value === field ? null : field
}

const emitFilterSelection = (field: string, selected: unknown[]) => {
  const all = valuesFor(field)
  const others = props.activeFilters.filter((f) => f.field !== field)
  const fullySelected =
    all.length > 0 &&
    selected.length === all.length &&
    all.every((v) => selected.some((s) => Object.is(s, v)))
  const next = fullySelected
    ? others
    : [...others, { field, operator: 'in' as const, value: selected }]
  emit('command', { type: 'filter', filters: next })
}

const onToggleValue = (field: string, value: unknown, checked: boolean) => {
  const current = selectedValuesFor(field)
  const next = checked
    ? current.some((v) => Object.is(v, value))
      ? current
      : [...current, value]
    : current.filter((v) => !Object.is(v, value))
  emitFilterSelection(field, next)
}

const onToggleAll = (field: string, checked: boolean) => {
  emitFilterSelection(field, checked ? valuesFor(field) : [])
}

const allSelected = (field: string): boolean => {
  const all = valuesFor(field)
  const selected = selectedValuesFor(field)
  return all.length > 0 && selected.length === all.length
}
</script>

<template>
  <div class="vp-filter-bar" aria-label="Filter bar">
    <div v-for="field in fields" :key="field" class="vp-filter-bar-item">
      <span class="vp-filter-bar-name">{{ field }}</span>
      <button
        type="button"
        class="vp-filter-bar-summary"
        :aria-expanded="openFilterField === field"
        :aria-label="`${field} filter`"
        @click="toggleFilterMenu(field)"
      >
        <span>{{ filterSummary(field) }}</span>
        <span class="vp-filter-bar-caret" aria-hidden="true">▾</span>
      </button>
      <div
        v-if="openFilterField === field"
        class="vp-filter-bar-menu"
        role="listbox"
        :aria-label="`${field} values`"
        @click.stop
      >
        <label class="vp-filter-bar-option">
          <input
            type="checkbox"
            :checked="allSelected(field)"
            @change="onToggleAll(field, ($event.target as HTMLInputElement).checked)"
          />
          <span>全选</span>
        </label>
        <label
          v-for="(value, idx) in valuesFor(field)"
          :key="`${field}-${idx}`"
          class="vp-filter-bar-option"
        >
          <input
            type="checkbox"
            :checked="isValueSelected(field, value)"
            @change="onToggleValue(field, value, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ String(value) }}</span>
        </label>
      </div>
    </div>
  </div>
</template>
