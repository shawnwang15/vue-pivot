# Aggregated dataKind（权威交叉结果）

`dataKind: 'aggregated'` 表示数据已经是交叉聚合后的宽表。库只负责按 `fields` 建维树、定位单元格并渲染，**不会再调用聚合器**。

数据可以来自后端，也可以由前端自行拼装；`dataKind` 描述的是**数据形态**，不是网络拓扑。

## 与 raw 的对比

| | `raw`（默认） | `aggregated` |
|---|---|---|
| `data` | 明细行 | 完整叶子交叉格（`rows∪columns` 字段都在） |
| `totals` / `subTotals` | — | 总计 / 小计宽表行（可选） |
| `preAggregated` | 可选 | **禁止** |
| 小计/总计 | `options.totals` 本地生成 | 仅当 `aggregate.totals` 声明且对应数组有数据时渲染 |
| 筛选/排序/TopN | 本地处理 | 视为查询参数，需重新取数 |
| Worker | 可用 | 不兼容 |

## DataCfg 形状

```ts
import type { AggregatedDataCfg } from '@vue-pivot/core'

const dataCfg: AggregatedDataCfg = {
  dataKind: 'aggregated',
  fields: {
    rows: ['region', 'category'],
    columns: ['segment'],
    values: [{ field: 'sales', aggregation: 'sum' }],
    valueInCols: true,
  },
  aggregate: {
    shape: 'wide',
    sparse: true,
    totals: {
      row: { grandTotal: true, subTotals: ['category'] },
      column: { grandTotal: true },
    },
  },
  fieldValues: {
    region: ['East', 'West'],
  },
  // 完整叶子：每个 row / column 维字段都必须有键（null 合法）
  data: [
    { region: 'East', category: 'Furniture', segment: 'Consumer', sales: 1200 },
  ],
  // 小计：前缀维保留，subTotalOn 及之后同轴维必须缺失
  subTotals: [
    {
      region: 'East',
      segment: 'Consumer',
      sales: 1600,
      subTotalOn: 'category',
      subTotalAxis: 'row',
    },
  ],
  // 总计：维字段「缺失」表示该轴已汇总
  totals: [
    { segment: 'Consumer', sales: 3100 }, // 行总计 × Consumer
    { sales: 6000 },                      // 角点
  ],
  totalLabel: 'Total',       // 可选，默认 Total
  subTotalLabel: 'Subtotal', // 可选，默认 Subtotal
}
```

### 解析规则

| 来源 | 行坐标 | 列坐标 |
|---|---|---|
| `data` | 全部 `fields.rows` 有键 | 全部 `fields.columns` 有键 |
| `totals` | 行维全缺 → 行 grandTotal；否则必须行维全在 | 列维同理 |
| `subTotals` + `subTotalAxis:'row'` | `subTotalOn` 之前的行维全在，其后全缺 | 列维必须完整叶子 |
| `subTotals` + `subTotalAxis:'column'` | 行维完整叶子 | 列侧同上 |

约束：

- 叶子禁止缺维；缺维只能出现在 `totals` / `subTotals`
- 用属性有无区分「缺失」与 `null`（`null` 仍是合法维值）
- 同一坐标只允许一条；重复报错
- `aggregate.totals` 未声明却出现对应合计 → 契约错误

维值只允许有限 JSON 标量（`string | number | boolean | null`）。查找键带类型标签，因此 `1` 与 `"1"`、`null` 与 `"null"` 不会碰撞。

### aggregate.totals

声明后端实际覆盖能力。未声明却出现对应记录会抛契约错误；声明了但没有记录则**不渲染**该总计节点。

## 查询与刷新

```ts
import { createPivotEngine, ServerDataSource } from '@vue-pivot/core'

const engine = createPivotEngine({
  dataCfg: {
    dataKind: 'aggregated',
    fields: { rows: ['region'], columns: ['segment'], values: ['sales'] },
    aggregate: { shape: 'wide' },
    data: [],
  },
  dataSource: new ServerDataSource('/api/pivot'),
  autoFetch: true,
})

engine.onQueryChange((query) => {
  // 受控模式：自行 fetch 后 engine.applyAggregatedResult(...)
  console.log(query.dataKind, query.axes)
})

await engine.refreshFromDataSource()
```

`PivotResult`（aggregated）建议：

```ts
{
  queryId: '...',
  rowTreeVersion: 1,
  colTreeVersion: 1,
  aggregate: { shape: 'wide', totals: { row: { grandTotal: true } } },
  fieldValues: { region: ['East', 'West'] },
  records: [/* 完整叶子 PivotRecord[] */],
  subTotals: [/* AggregatedSubTotalRecord[] */],
  totals: [/* PivotRecord[] */],
}
```

换轴、改聚合、筛选、排序会清空 `data` / `totals` / `subTotals` 并置 `status: 'stale'`，然后发出 `queryChange`；若配置了非 Local 的 `dataSource` 且 `autoFetch`，会自动 `refreshFromDataSource`。

## Vue

```vue
<PivotSheet
  :data-cfg="dataCfg"
  :data-source="dataSource"
  :auto-fetch="true"
  :filter-facets="dataCfg.fieldValues"
  show-field-panel
  @query-change="onQueryChange"
/>
```

Playground 示例：`/aggregated`。

## SQL GROUPING SETS 映射提示

```sql
SELECT region, category, segment, SUM(sales) AS sales
FROM orders
GROUP BY GROUPING SETS (
  (region, category, segment), -- → data（完整叶子）
  (region, segment),           -- → subTotals（subTotalOn: category, subTotalAxis: row）
  (segment),                   -- → totals（行总计 × segment）
  ()                           -- → totals（角点）
)
```

按 `GROUPING()` 位图拆进 `data` / `subTotals` / `totals`，度量写入宽表字段即可。
