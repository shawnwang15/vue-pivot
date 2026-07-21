<script setup lang="ts">
import { computed, ref } from 'vue'
import { PivotSheet, exportToCsv, downloadText, copySelection } from '@vue-pivot/vue'
import type { DataCfg, PivotOptions } from '@vue-pivot/core'
import { createSuperstoreData } from '../data/superstore'

const records = createSuperstoreData(1)

const dataCfg = ref<DataCfg>({
  sheetType: 'table',
  fields: {
    rows: [],
    columns: ['province', 'city', 'type', 'sub_type', 'sales', 'profit', 'quantity'],
    values: [],
    filters: ['province', 'type'],
  },
  meta: [
    { field: 'province', name: '省份' },
    { field: 'city', name: '城市' },
    { field: 'type', name: '品类' },
    { field: 'sub_type', name: '子品类' },
    { field: 'sales', name: '销售额' },
    { field: 'profit', name: '利润' },
    { field: 'quantity', name: '件数' },
  ],
  data: records,
})

const options = ref<PivotOptions>({
  interaction: {
    brushSelection: true,
    selectedCellsSpotlight: true,
    multiSelection: true,
  },
  style: {
    rowHeight: 32,
    colWidth: 120,
  },
})

const sheetRef = ref<InstanceType<typeof PivotSheet> | null>(null)
const selectionCount = computed(() => sheetRef.value?.selection?.length ?? 0)
const rowCount = computed(() => sheetRef.value?.viewport?.rowCount ?? records.length)

const onExportCsv = () => {
  const engine = sheetRef.value?.engine
  if (!engine) return
  downloadText('table.csv', exportToCsv(engine, { formatted: true }), 'text/csv')
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
        <h1>明细表（sheetType: table）</h1>
        <p>每条明细一行，不交叉聚合；columns 为展示列。</p>
      </div>
      <div class="actions">
        <button type="button" @click="onCopy">复制选区</button>
        <button type="button" @click="onExportCsv">导出 CSV</button>
        <span>行数: {{ rowCount }}</span>
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
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);
  padding: 16px 20px 20px;
  box-sizing: border-box;
}
.demo-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}
.demo-head h1 {
  margin: 0 0 4px;
  font-size: 1.25rem;
}
.demo-head p {
  margin: 0;
  color: #5b6775;
  font-size: 0.9rem;
}
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.actions button {
  border: 1px solid #c5d0dc;
  background: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
.sheet-wrap {
  flex: 1;
  min-height: 0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.7) inset, 0 8px 24px rgba(27, 36, 48, 0.06);
}
</style>
