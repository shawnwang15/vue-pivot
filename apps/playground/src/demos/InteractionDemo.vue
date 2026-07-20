<script setup lang="ts">
import { ref } from 'vue'
import { PivotSheet, exportToExcelXml, downloadText } from '@vue-pivot/vue'
import { renderPivotChart } from '@vue-pivot/charts'
import type { DataCfg, PivotOptions, SelectionRange } from '@vue-pivot/core'

const dataCfg = ref<DataCfg>({
  fields: {
    rows: ['region'],
    columns: ['category'],
    values: [{ field: 'sales', aggregation: 'sum' }],
    valueInCols: true,
  },
  meta: [
    { field: 'region', name: '地区' },
    { field: 'city', name: '城市' },
    { field: 'category', name: '品类' },
    { field: 'sub_category', name: '子品类' },
    { field: 'channel', name: '渠道' },
    { field: 'segment', name: '客户细分' },
    { field: 'year', name: '年份' },
    { field: 'quarter', name: '季度' },
    { field: 'sales', name: '销售额' },
    { field: 'profit', name: '利润' },
    { field: 'quantity', name: '件数' },
    { field: 'discount', name: '折扣' },
  ],
  data: [
    { region: 'East', city: 'Boston', category: 'Furniture', sub_category: 'Chairs', channel: 'Online', segment: 'Consumer', year: 2024, quarter: 'Q1', sales: 120, profit: 28, quantity: 4, discount: 0.1 },
    { region: 'East', city: 'Boston', category: 'Technology', sub_category: 'Phones', channel: 'Store', segment: 'Corporate', year: 2024, quarter: 'Q2', sales: 220, profit: 55, quantity: 2, discount: 0 },
    { region: 'East', city: 'NYC', category: 'Furniture', sub_category: 'Tables', channel: 'Online', segment: 'Home Office', year: 2024, quarter: 'Q1', sales: 90, profit: 12, quantity: 1, discount: 0.15 },
    { region: 'East', city: 'NYC', category: 'Office Supplies', sub_category: 'Paper', channel: 'Store', segment: 'Consumer', year: 2025, quarter: 'Q1', sales: 45, profit: 18, quantity: 10, discount: 0 },
    { region: 'West', city: 'SF', category: 'Technology', sub_category: 'Laptops', channel: 'Online', segment: 'Corporate', year: 2024, quarter: 'Q3', sales: 310, profit: 72, quantity: 3, discount: 0.05 },
    { region: 'West', city: 'SF', category: 'Office Supplies', sub_category: 'Binders', channel: 'Dealer', segment: 'Consumer', year: 2025, quarter: 'Q2', sales: 60, profit: 22, quantity: 8, discount: 0 },
    { region: 'West', city: 'LA', category: 'Furniture', sub_category: 'Sofas', channel: 'Store', segment: 'Home Office', year: 2024, quarter: 'Q4', sales: 150, profit: 30, quantity: 1, discount: 0.2 },
    { region: 'West', city: 'LA', category: 'Technology', sub_category: 'Monitors', channel: 'Online', segment: 'Corporate', year: 2025, quarter: 'Q1', sales: 180, profit: 40, quantity: 2, discount: 0.1 },
    { region: 'Central', city: 'Chicago', category: 'Furniture', sub_category: 'Bookcases', channel: 'Dealer', segment: 'Consumer', year: 2024, quarter: 'Q2', sales: 200, profit: 35, quantity: 2, discount: 0.05 },
    { region: 'Central', city: 'Dallas', category: 'Technology', sub_category: 'Accessories', channel: 'Online', segment: 'Corporate', year: 2025, quarter: 'Q3', sales: 95, profit: 25, quantity: 5, discount: 0 },
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
  background: #2f62b5;
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
