# Getting Started

## 安装

```bash
pnpm add @vue-pivot/vue @vue-pivot/core @tanstack/vue-table @tanstack/vue-virtual
```

图表可选：

```bash
pnpm add @vue-pivot/charts echarts
```

## 最小示例

```vue
<script setup lang="ts">
import { PivotSheet } from '@vue-pivot/vue'
import '@vue-pivot/vue/style.css'

const dataCfg = {
  fields: {
    rows: ['province', 'city'],
    columns: ['type'],
    values: ['number'],
    valueInCols: true,
  },
  data: [
    { province: '浙江', city: '杭州', type: '笔', number: 10 },
  ],
}

const options = {
  hierarchyType: 'grid-tree',
  totals: { row: { showGrandTotals: true } },
}
</script>

<template>
  <PivotSheet :data-cfg="dataCfg" :options="options" />
</template>
```

## 注意

- **首期不支持 SSR**：请在客户端挂载（如 Nuxt 使用 `<ClientOnly>`）。
- 单元格编辑/回写不在首发范围。
