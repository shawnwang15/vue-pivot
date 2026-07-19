<script setup lang="ts">
import { ref } from 'vue'
import { PivotSheet, exportToExcelXml, downloadText } from '@vue-pivot/vue'
import { renderPivotChart } from '@vue-pivot/charts'
import type { DataCfg, PivotOptions, SelectionRange } from '@vue-pivot/core'

const dataCfg = ref<DataCfg>({
  fields: {
    rows: ['region', 'city'],
    columns: ['category'],
    values: [{ field: 'sales', aggregation: 'sum' }],
    valueInCols: true,
  },
  data: [
    { region: 'East', city: 'Boston', category: 'Furniture', sales: 120 },
    { region: 'East', city: 'Boston', category: 'Technology', sales: 220 },
    { region: 'East', city: 'NYC', category: 'Furniture', sales: 90 },
    { region: 'West', city: 'SF', category: 'Technology', sales: 310 },
    { region: 'West', city: 'LA', category: 'Furniture', sales: 150 },
    { region: 'West', city: 'LA', category: 'Technology', sales: 180 },
  ],
})

const options = ref<PivotOptions>({
  hierarchyType: 'tree',
  defaultExpandDepth: 1,
  interaction: { brushSelection: true, multiSelection: true },
  totals: { row: { showGrandTotals: true }, column: { showGrandTotals: true } },
})

const sheetRef = ref<InstanceType<typeof PivotSheet> | null>(null)
const chartEl = ref<HTMLElement | null>(null)
const log = ref<string[]>([])

const onBrush = (selection: SelectionRange[]) => {
  log.value.unshift(`brush: ${selection.length} range(s)`)
}

const onExcel = () => {
  const engine = sheetRef.value?.engine
  if (!engine) return
  downloadText(
    'pivot.xls',
    exportToExcelXml(engine, { formatted: true, includeTotals: true }),
    'application/vnd.ms-excel',
  )
}

const onChart = async () => {
  const engine = sheetRef.value?.engine
  if (!engine || !chartEl.value) return
  await renderPivotChart(chartEl.value, engine)
}
</script>

<template>
  <section class="demo">
    <div class="demo-head">
      <div>
        <h1>交互 / 导出 / 透视图</h1>
        <p>刷选、树形展开、Excel 导出与 ECharts 透视图适配。</p>
      </div>
      <div class="actions">
        <button type="button" @click="onExcel">导出 Excel</button>
        <button type="button" @click="onChart">渲染透视图</button>
      </div>
    </div>
    <div class="layout">
      <div class="sheet-wrap">
        <PivotSheet
          ref="sheetRef"
          :data-cfg="dataCfg"
          :options="options"
          show-field-panel
          @brush-selection="onBrush"
        />
      </div>
      <aside>
        <div ref="chartEl" class="chart" />
        <ul>
          <li v-for="(item, i) in log.slice(0, 8)" :key="i">{{ item }}</li>
        </ul>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.demo {
  height: calc(100vh - 90px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.demo-head {
  display: flex;
  justify-content: space-between;
}
h1 {
  margin: 0 0 4px;
  font-size: 28px;
}
p {
  margin: 0;
  color: #5b6775;
}
.actions {
  display: flex;
  gap: 8px;
}
button {
  border: 0;
  background: #0f6e56;
  color: #fff;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
.layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
}
.sheet-wrap,
.chart {
  min-height: 280px;
  height: 100%;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #d5dde5;
}
aside {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
ul {
  margin: 0;
  padding-left: 18px;
  color: #5b6775;
  font-size: 13px;
}
</style>
