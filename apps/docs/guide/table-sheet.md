# 明细表（sheetType: table）

`sheetType: 'table'` 将 `PivotSheet` 切换为**扁平明细表**：每条 `data` 记录一行，`fields.columns` 为展示列，**不做交叉聚合**。

对标 AntV S2 的 `TableSheet` 场景。

## 与透视的区别

| | `sheetType: 'pivot'`（默认） | `sheetType: 'table'` |
|---|---|---|
| 行 | 行维树叶子 | 每条明细一行（可重复） |
| `columns` | 列维（交叉） | 展示字段（扁平表头） |
| `rows` / `values` | 参与透视 | **必须为空** |
| 聚合 | 本地 / 权威交叉 | 无 |
| 布局 | 角区 + 行头 + 列头 + 数据区 | 列头 + 数据区 |

`dataKind`（`raw` / `aggregated`）描述**数据形态**；`sheetType` 描述**布局形态**。明细表仅支持 `dataKind: 'raw'`（或省略）。

## 契约

```ts
import type { RawDataCfg } from '@vue-pivot/core'

const dataCfg: RawDataCfg = {
  sheetType: 'table',
  fields: {
    rows: [],
    columns: ['category', 'region', 'sales'],
    values: [],
    filters: ['region'], // 可选，筛选用
  },
  meta: [
    { field: 'category', name: '品类' },
    { field: 'sales', name: '销售额' },
  ],
  data: [
    { category: 'Furniture', region: 'East', sales: 100 },
    { category: 'Furniture', region: 'East', sales: 50 }, // 保留两行
  ],
}
```

约束：

- `sheetType: 'table'` + `dataKind: 'aggregated'` → 错误
- `rows` / `values` 非空 → 错误
- `preAggregated` → 不支持
- TopN / expand / drill / totals → 忽略或 no-op
- 字段面板仅暴露 `columns`（展示列）与 `filters`

## 用法

```vue
<script setup lang="ts">
import { PivotSheet } from '@vue-pivot/vue'
import type { DataCfg, PivotOptions } from '@vue-pivot/core'

const dataCfg: DataCfg = {
  sheetType: 'table',
  fields: {
    rows: [],
    columns: ['province', 'city', 'sales'],
    values: [],
  },
  data: [/* ... */],
}

const options: PivotOptions = {
  interaction: { brushSelection: true },
  style: { rowHeight: 32, colWidth: 120 },
}
</script>

<template>
  <PivotSheet :data-cfg="dataCfg" :options="options" show-field-panel />
</template>
```

## 从 S2 TableSheet 迁移

`fromS2DataCfg` 在 `rows`/`values` 皆空且 `columns` 非空时，会推断为 `sheetType: 'table'`；也可显式传入 `sheetType: 'table'`。

```ts
import { fromS2DataCfg } from '@vue-pivot/core'

const dataCfg = fromS2DataCfg({
  sheetType: 'table',
  fields: { columns: ['province', 'city', 'sales'] },
  data,
})
```

## 查询契约

`buildPivotQuery` / `queryChange` 会带上 `sheetType: 'table'`。远端 DataSource 应按明细行返回 `records`，不要当成交叉透视查询。
