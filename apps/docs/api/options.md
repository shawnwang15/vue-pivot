# PivotOptions

`PivotOptions` 控制透视表的**展示形态、交互、合计、排序筛选与样式**。通过 `PivotSheet` 的 `options` prop，或引擎命令 `setOptions` 传入。

```ts
import type { PivotOptions } from '@vue-pivot/core'

const options: PivotOptions = {
  hierarchyType: 'grid-tree',
  totals: { row: { showGrandTotals: true } },
}
```

与 `DataCfg` 的分工：

| | DataCfg | PivotOptions |
| --- | --- | --- |
| 职责 | 数据从哪来、字段怎么分区 | 怎么展示与交互 |
| 合计 | aggregated 用 `aggregate.totals` 声明数据里有什么 | raw 用 `options.totals` 决定本地生成什么 |
| 筛选排序 | — | `filters` / `sort` / `topN`（aggregated 下多为查询参数，需重新取数） |

---

## 顶层属性一览

| 属性 | 类型 | 默认 | 用途 |
| --- | --- | --- | --- |
| `hierarchyType` | `'grid' \| 'tree' \| 'grid-tree'` | `'grid'` | 行头层级展示形态 |
| `totals` | `TotalsOptions` | — | 行/列总计与小计（主要作用于 **raw**） |
| `interaction` | `InteractionOptions` | — | 选择、悬停、拖拽等交互开关 |
| `conditions` | `ConditionsOptions` | — | 条件格式（文字色、背景、区间条、图标） |
| `style` | `StyleOptions` | — | 行高列宽、冻结、默认展开深度等 |
| `sort` | `SortSpec[]` | `[]` | 排序规则 |
| `filters` | `FilterSpec[]` | `[]` | 过滤谓词 |
| `topN` | `TopNSpec[]` | `[]` | TopN 截断 |
| `derivedMeasures` | `DerivedMeasureSpec[]` | — | 派生指标（同比、环比等） |
| `nullPrecision` | `NullPrecisionOptions` | — | 空值展示与数值精度 |
| `defaultExpandDepth` | `number` | `1`（或取自 `style.rowCell.expandDepth`） | 树/网格树默认展开层数 |
| `asyncExpand` | `boolean` | — | `true` 时节点展开可通过 DataSource.drill 异步加载 |

---

## `hierarchyType`

| 值 | 用途 |
| --- | --- |
| `grid` | 平铺网格：每层维占一列/行，无折叠 |
| `tree` | 树形：行头可折叠展开 |
| `grid-tree` | 网格 + 树：兼顾层级折叠与网格对齐 |

```ts
options: { hierarchyType: 'grid-tree' }
```

---

## `totals`（TotalsOptions）

控制 **raw** 模式下本地生成的总计/小计。aggregated 模式下合计数据来自 `DataCfg.totals` / `subTotals`，并受 `aggregate.totals` 声明约束；此处的展示标签等仍可作参考，但权威数据不在 options 里。

```ts
interface TotalsOptions {
  row?: TotalsAxisOptions
  column?: TotalsAxisOptions
}
```

### `TotalsAxisOptions`

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `showGrandTotals` | `boolean` | 是否显示该轴总计 |
| `showSubTotals` | `boolean` | 是否显示该轴小计 |
| `subTotalsDimensions` | `string[]` | 在哪些维上出小计；省略则按布局推导 |
| `reverseLayout` | `boolean` | 合计位置反向（如总计置顶/置左） |
| `label` | `string` | 总计文案 |
| `subLabel` | `string` | 小计文案 |

```ts
totals: {
  row: {
    showGrandTotals: true,
    showSubTotals: true,
    subTotalsDimensions: ['city'],
    label: '合计',
    subLabel: '小计',
  },
  column: { showGrandTotals: true },
}
```

---

## `interaction`（InteractionOptions）

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `brushSelection` | `boolean` | 框选单元格；触发 `brushSelection` 事件 |
| `multiSelection` | `boolean` | 多选（配合修饰键等） |
| `selectedCellsSpotlight` | `boolean` | 选中格高亮强调 |
| `hoverHighlight` | `boolean` | 悬停高亮同行/列或单元格 |
| `resize` | `boolean` | 拖拽调整列宽/行高 |
| `dragReorder` | `boolean` | 拖拽重排列头/字段顺序 |

```ts
interaction: {
  brushSelection: true,
  hoverHighlight: true,
  resize: true,
}
```

---

## `conditions`（ConditionsOptions）

按规则动态改写单元格外观。每条规则可选限定 `field`，`mapping` 根据值返回样式载荷。

```ts
interface ConditionRule {
  field?: string
  mapping: (value: unknown, cell: unknown) => unknown
}

interface ConditionsOptions {
  text?: ConditionRule[]        // 文字颜色等
  background?: ConditionRule[]  // 背景色
  interval?: ConditionRule[]    // 数据条（通常返回 0~1 比例）
  icon?: ConditionRule[]        // 图标
}
```

```ts
conditions: {
  background: [
    { field: 'sales', mapping: (v) => (Number(v) > 1000 ? '#e2eeff' : undefined) },
  ],
  interval: [
    { field: 'sales', mapping: (v) => Number(v) / 5000 },
  ],
  text: [
    { field: 'profit', mapping: (v) => (Number(v) < 0 ? '#b91c1c' : undefined) },
  ],
}
```

更多示例见 [Customization](/guide/customization)。

---

## `style`（StyleOptions）

| 属性 | 类型 | 默认（实现侧常见） | 用途 |
| --- | --- | --- | --- |
| `rowHeight` | `number` | `32` | 数据行高（px） |
| `colWidth` | `number` | `120` | 数据列宽（px） |
| `rowHeaderWidth` | `number` | `160` | 行头宽度（px） |
| `cornerWidth` | `number` | — | 角头宽度（px） |
| `frozenRowCount` | `number` | — | 冻结前 N 行 |
| `frozenColCount` | `number` | — | 冻结前 N 列 |
| `rowCell.expandDepth` | `number` | — | 行树默认展开深度（可被 `defaultExpandDepth` 覆盖） |
| `colCell.expandDepth` | `number` | — | 列树默认展开深度 |

视觉主题（颜色、字体）请用 CSS 变量覆盖，见 [Customization](/guide/customization)，不要塞进 `style`。

```ts
style: {
  rowHeight: 36,
  colWidth: 128,
  rowHeaderWidth: 180,
  frozenColCount: 1,
  rowCell: { expandDepth: 2 },
}
```

---

## `sort`（SortSpec[]）

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `field` | `string` | 排序作用的维或字段 |
| `order` | `'asc' \| 'desc'` | 升序 / 降序 |
| `measure` | `string` | 按聚合后的指标排序时指定指标字段 |
| `method` | `'alpha' \| 'measure'` | `alpha` 按维值字母；`measure` 按指标值 |

```ts
sort: [
  { field: 'province', order: 'asc', method: 'alpha' },
  { field: 'city', order: 'desc', measure: 'sales', method: 'measure' },
]
```

---

## `filters`（FilterSpec[]）

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `field` | `string` | 过滤字段 |
| `operator` | 见下表 | 比较运算符 |
| `value` | `unknown` | 比较值；`between` 等可为数组 |
| `postAggregation` | `boolean` | `false`（默认）= 聚合前维过滤；`true` = 聚合后指标过滤 |

### `operator`

| 运算符 | 含义 |
| --- | --- |
| `in` / `notIn` | 属于 / 不属于集合 |
| `eq` / `ne` | 等于 / 不等于 |
| `gt` / `gte` / `lt` / `lte` | 大于 / 大于等于 / 小于 / 小于等于 |
| `between` | 区间 |
| `contains` | 字符串包含 |

```ts
filters: [
  { field: 'province', operator: 'in', value: ['浙江', '江苏'] },
  { field: 'sales', operator: 'gte', value: 100, postAggregation: true },
]
```

字段面板「过滤」浮层会派发 `filter` 命令（通常 `operator: 'in'`），与此处结构一致。

---

## `topN`（TopNSpec[]）

按指标保留每个分组前/后 N 项。

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `field` | `string` | 截断作用的维 |
| `n` | `number` | 保留条数 |
| `measure` | `string` | 排序依据的指标 |
| `order` | `'asc' \| 'desc'` | 取最小 N 或最大 N |
| `others` | `boolean` | 是否把剩余项折叠为「其他」 |

```ts
topN: [
  { field: 'city', n: 10, measure: 'sales', order: 'desc', others: true },
]
```

---

## `derivedMeasures`（DerivedMeasureSpec[]）

声明派生/计算指标，可与 `fields.values` 中的 `calcId` 对应。

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `id` | `string` | 派生指标 id |
| `name` | `string` | 显示名 |
| `kind` | `'yoy' \| 'mom' \| 'ratio' \| 'rank' \| 'custom'` | 同比 / 环比 / 占比 / 排名 / 自定义 |
| `baseMeasure` | `string` | 基础指标字段 |
| `periodField` | `string` | 期间比较所用时间维（yoy/mom） |

```ts
derivedMeasures: [
  {
    id: 'sales_yoy',
    name: '销售额同比',
    kind: 'yoy',
    baseMeasure: 'sales',
    periodField: 'year',
  },
]
```

---

## `nullPrecision`（NullPrecisionOptions）

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `nullDisplay` | `string` | 空值占位文案（如 `'-'`） |
| `treatNullAsZero` | `boolean` | 聚合时是否把 `null` 当 0 |
| `precision` | `number` | 默认小数位数（可与 `meta.formatter` 叠加理解） |

```ts
nullPrecision: {
  nullDisplay: '-',
  treatNullAsZero: false,
  precision: 2,
}
```

---

## `defaultExpandDepth` / `asyncExpand`

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `defaultExpandDepth` | `number` | 树 / grid-tree 初始展开到第几层（0 起算深度由引擎实现约定）；优先于仅写在 `style.rowCell.expandDepth` 的值 |
| `asyncExpand` | `boolean` | 为 `true` 时，展开节点可走 DataSource 的异步 drill，而不是假定子树已全部在本地 |

```ts
options: {
  hierarchyType: 'tree',
  defaultExpandDepth: 2,
  asyncExpand: true,
}
```

---

## 完整示例

```ts
import type { PivotOptions } from '@vue-pivot/core'

const options: PivotOptions = {
  hierarchyType: 'grid-tree',
  defaultExpandDepth: 2,
  totals: {
    row: {
      showGrandTotals: true,
      showSubTotals: true,
      label: '合计',
      subLabel: '小计',
    },
    column: { showGrandTotals: true },
  },
  interaction: {
    brushSelection: true,
    hoverHighlight: true,
    resize: true,
  },
  style: {
    rowHeight: 32,
    colWidth: 120,
    rowHeaderWidth: 160,
  },
  sort: [{ field: 'province', order: 'asc', method: 'alpha' }],
  filters: [{ field: 'segment', operator: 'in', value: ['Consumer'] }],
  topN: [{ field: 'city', n: 20, measure: 'sales', order: 'desc' }],
  conditions: {
    background: [
      { field: 'sales', mapping: (v) => (Number(v) > 1000 ? '#e2eeff' : undefined) },
    ],
  },
  nullPrecision: { nullDisplay: '-', precision: 2 },
}
```

```vue
<template>
  <PivotSheet :data-cfg="dataCfg" :options="options" />
</template>
```
