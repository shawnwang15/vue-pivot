<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { PivotSheet } from '@vue-pivot/vue'
import type { AggregatedDataCfg, PivotDataSource, PivotQuery } from '@vue-pivot/core'
import {
  createInitialAggregatedCfg,
  createMockAggregatedDataSource,
  loadAggregatedMock,
} from '../data/aggregated-superstore'

const includeTotals = ref(true)
const ready = ref(false)
const bootError = ref<string | null>(null)
const dataSource = ref<PivotDataSource | null>(null)
const dataCfg = ref<AggregatedDataCfg | null>(null)
const lastQuery = ref<PivotQuery | null>(null)
const sheetRef = ref<{ refresh: () => Promise<void> } | null>(null)

const options = computed(() => ({
  hierarchyType: 'grid' as const,
  defaultExpandDepth: 2,
  totals: includeTotals.value
    ? {
        row: { showGrandTotals: true, showSubTotals: true, subTotalsDimensions: ['category'] },
        column: { showGrandTotals: true },
      }
    : {},
  interaction: { brushSelection: true },
  style: { rowHeight: 32, colWidth: 110 },
}))

const onQueryChange = (query: PivotQuery) => {
  lastQuery.value = query
}

const toggleTotals = async () => {
  includeTotals.value = !includeTotals.value
  await nextTick()
  await sheetRef.value?.refresh()
}

onMounted(async () => {
  try {
    const mock = await loadAggregatedMock()
    dataCfg.value = createInitialAggregatedCfg(mock, includeTotals.value)
    dataSource.value = createMockAggregatedDataSource()
    ready.value = true
    await nextTick()
    await sheetRef.value?.refresh()
  } catch (err) {
    bootError.value = err instanceof Error ? err.message : String(err)
  }
})
</script>

<template>
  <div class="demo">
    <div class="toolbar">
      <h2>Aggregated dataKind demo</h2>
      <p>
        Loads authoritative leaf / <code>totals</code> / <code>subTotals</code> from
        <code>/mock/aggregated-superstore.json</code>. Frontend skips aggregators.
      </p>
      <label>
        <input
          type="checkbox"
          :checked="includeTotals"
          :disabled="!ready"
          @change="toggleTotals"
        />
        Request row/column totals
      </label>
      <div v-if="lastQuery" class="query">
        last query measures:
        {{ lastQuery.measures.map((m) => `${m.field}:${m.aggregation}`).join(', ') }}
      </div>
      <div v-if="bootError" class="boot-error">{{ bootError }}</div>
    </div>
    <div class="sheet-wrap">
      <PivotSheet
        v-if="ready && dataCfg && dataSource"
        ref="sheetRef"
        :data-cfg="dataCfg"
        :options="options"
        :data-source="dataSource"
        :auto-fetch="true"
        :show-field-panel="true"
        :filter-facets="dataCfg.fieldValues"
        @query-change="onQueryChange"
      />
      <div v-else-if="!bootError" class="boot-loading">Loading mock…</div>
    </div>
  </div>
</template>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 88px);
}
.toolbar h2 {
  margin: 0 0 6px;
}
.toolbar p {
  margin: 0 0 8px;
  color: #4b5b6c;
  font-size: 13px;
}
.query {
  margin-top: 6px;
  font-size: 12px;
  color: #2f62b5;
}
.boot-error {
  margin-top: 8px;
  color: #9b1c1c;
  font-size: 13px;
}
.boot-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #5b6b7c;
}
.sheet-wrap {
  flex: 1;
  min-height: 0;
  border: 1px solid #d5dde5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
code {
  font-size: 12px;
  background: #eef3f9;
  padding: 1px 4px;
  border-radius: 3px;
}
</style>
