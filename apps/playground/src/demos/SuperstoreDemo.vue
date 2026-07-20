<script setup lang="ts">
import { computed, ref } from 'vue'
import { PivotSheet, exportToCsv, downloadText, copySelection } from '@vue-pivot/vue'
import type { DataCfg, PivotOptions } from '@vue-pivot/core'
import { createSuperstoreData } from '../data/superstore'

const records = createSuperstoreData(2)

const dataCfg = ref<DataCfg>({
  fields: {
    rows: ['province'],
    columns: ['type', 'sub_type'],
    values: ['number'],
    valueInCols: true,
  },
  meta: [
    { field: 'province', name: '省份' },
    { field: 'city', name: '城市' },
    { field: 'type', name: '品类' },
    { field: 'sub_type', name: '子品类' },
    { field: 'channel', name: '渠道' },
    { field: 'segment', name: '客户细分' },
    { field: 'ship_mode', name: '配送方式' },
    { field: 'year', name: '年份' },
    { field: 'quarter', name: '季度' },
    { field: 'month', name: '月份' },
    { field: 'number', name: '数量', formatter: (v) => `${v}` },
    { field: 'sales', name: '销售额' },
    { field: 'profit', name: '利润' },
    { field: 'discount', name: '折扣' },
    { field: 'quantity', name: '件数' },
  ],
  data: records,
})

const options = ref<PivotOptions>({
  hierarchyType: 'grid-tree',
  defaultExpandDepth: 1,
  totals: {
    row: { showGrandTotals: true, showSubTotals: true, subTotalsDimensions: ['province'] },
    column: { showGrandTotals: true },
  },
  interaction: {
    brushSelection: true,
    selectedCellsSpotlight: true,
    multiSelection: true,
  },
  conditions: {
    background: [
      {
        field: 'number',
        mapping: (v) => (Number(v) > 700 ? '#e2eeff' : Number(v) < 200 ? '#fde8e8' : undefined),
      },
    ],
    interval: [
      {
        field: 'number',
        mapping: (v) => Math.min(1, (Number(v) || 0) / 1000),
      },
    ],
  },
  style: {
    rowHeight: 32,
    colWidth: 110,
    rowCell: { expandDepth: 1 },
  },
})

const sheetRef = ref<InstanceType<typeof PivotSheet> | null>(null)
const selectionCount = computed(() => sheetRef.value?.selection?.length ?? 0)

const onExportCsv = () => {
  const engine = sheetRef.value?.engine
  if (!engine) return
  downloadText('pivot.csv', exportToCsv(engine, { formatted: true, includeTotals: true }), 'text/csv')
}

const onCopy = async () => {
  const engine = sheetRef.value?.engine
  if (!engine) return
  await copySelection(engine)
}
</script>

<template>
  <section class="demo">
    <div class="demo-head">
      <div>
        <h1>Superstore 透视场景</h1>
        <p>对标 S2/VTable 的行列维交叉、小计总计、刷选与条件格式。</p>
      </div>
      <div class="actions">
        <button type="button" @click="onCopy">复制选区</button>
        <button type="button" @click="onExportCsv">导出 CSV</button>
        <span>选区: {{ selectionCount }}</span>
      </div>
    </div>
    <div class="sheet-wrap">
      <PivotSheet
        ref="sheetRef"
        :data-cfg="dataCfg"
        :options="options"
        show-field-panel
      />
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
  gap: 16px;
  align-items: end;
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
  align-items: center;
}
button {
  border: 1px solid #2f62b5;
  background: #2f62b5;
  color: white;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
}
.sheet-wrap {
  flex: 1;
  min-height: 0;
}
</style>
