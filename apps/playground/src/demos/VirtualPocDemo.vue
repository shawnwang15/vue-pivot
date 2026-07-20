<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PivotSheet } from '@vue-pivot/vue'
import type { DataCfg, PivotOptions } from '@vue-pivot/core'

function buildMatrix(rowN: number, colN: number) {
  const rows: string[] = []
  const cols: string[] = []
  const data: Record<string, unknown>[] = []
  for (let r = 0; r < rowN; r++) rows.push(`R${r}`)
  for (let c = 0; c < colN; c++) cols.push(`C${c}`)
  // Ensure every row/col leaf exists while keeping record count manageable:
  // full first 3 rows across all cols + diagonal-ish samples for remaining rows.
  for (let c = 0; c < colN; c++) {
    for (let r = 0; r < Math.min(rowN, 3); r++) {
      data.push({ row: rows[r], col: cols[c], value: (r * 17 + c * 3) % 997 })
    }
  }
  for (let r = 3; r < rowN; r++) {
    data.push({ row: rows[r], col: cols[r % colN], value: (r * 17) % 997 })
  }
  return { rows, cols, data }
}

const ROW_N = 5000
const COL_N = 200
const matrix = buildMatrix(ROW_N, COL_N)

const dataCfg = ref<DataCfg>({
  fields: {
    rows: ['row'],
    columns: ['col'],
    values: ['value'],
    valueInCols: true,
  },
  data: matrix.data,
})

const options = ref<PivotOptions>({
  hierarchyType: 'grid',
  style: { rowHeight: 28, colWidth: 72, frozenColCount: 1 },
  interaction: { brushSelection: true },
})

const metrics = ref({
  firstPaintMs: 0,
  rowCount: 0,
  colCount: 0,
})

const sheetRef = ref<InstanceType<typeof PivotSheet> | null>(null)

onMounted(() => {
  const t0 = performance.now()
  requestAnimationFrame(() => {
    metrics.value.firstPaintMs = Math.round(performance.now() - t0)
    metrics.value.rowCount = sheetRef.value?.viewport?.rowCount ?? 0
    metrics.value.colCount = sheetRef.value?.viewport?.columnCount ?? 0
  })
})
</script>

<template>
  <section class="demo">
    <div class="demo-head">
      <div>
        <h1>5k × 200 虚拟渲染 PoC</h1>
        <p>验证单滚动源、二维虚拟化、多级表头窗口投影与冻结区同步。</p>
      </div>
      <div class="metrics">
        <div>首屏约 {{ metrics.firstPaintMs }} ms</div>
        <div>逻辑矩阵 {{ metrics.rowCount }} × {{ metrics.colCount }}</div>
      </div>
    </div>
    <div class="sheet-wrap">
      <PivotSheet ref="sheetRef" :data-cfg="dataCfg" :options="options" />
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
.metrics {
  font-variant-numeric: tabular-nums;
  color: #2f62b5;
  font-weight: 600;
}
.sheet-wrap {
  flex: 1;
  min-height: 0;
}
</style>
