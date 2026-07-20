# DataCfg

`DataCfg` 描述透视表的**数据形态**与**字段布局**，是 `PivotSheet` / `usePivotSheet` / `createPivotEngine` 的核心入参。

```ts
type DataCfg = RawDataCfg | AggregatedDataCfg
```

通过 `dataKind` 区分两种模式：

| 模式 | `dataKind` | 含义 |
| --- | --- | --- |
| 明细（默认） | `'raw'` 或省略 | 明细行，由库本地交叉聚合 |
| 权威交叉结果 | `'aggregated'` | 已交叉聚合的宽表，库只建维树并渲染 |

更完整的 aggregated 契约见 [Aggregated Mode](/guide/aggregated-mode)。

---

## 共用结构

### `fields: PivotFields`（必填）

字段分区，决定行头、列头、指标与筛选用维。

| 属性 | 类型 | 默认 | 用途 |
| --- | --- | --- | --- |
| `rows` | `string[]` | — | 行维字段，自上而下嵌套 |
| `columns` | `string[]` | — | 列维字段，自左向右嵌套 |
| `values` | `MeasureInput[]` | — | 指标；可为字段名字符串，或带聚合的对象 |
| `valueInCols` | `boolean` | `true`（迁移辅助） | `true` 时指标铺在列上；`false` 时铺在行上 |
| `filters` | `string[]` | — | 筛选用维（不参与交叉轴）；字段面板可拖入此区 |

#### `MeasureInput` / `MeasureField`

```ts
type MeasureInput = string | MeasureField

interface MeasureField {
  field: string
  aggregation?: AggregatorId  // 默认 'sum'
  name?: string              // 显示名
  calcId?: string            // 派生/计算指标 id
}
```

内置聚合：`sum` | `avg` | `count` | `min` | `max` | `distinctCount`。也可传自定义聚合 id（需自行注册）。

**示例：**

```ts
fields: {
  rows: ['province', 'city'],
  columns: ['type'],
  values: [
    'sales',
    { field: 'profit', aggregation: 'avg', name: '平均利润' },
  ],
  valueInCols: true,
  filters: ['segment'],
}
```

### `meta?: FieldMeta[]`

字段元数据：显示名、格式化、描述。未配置时用字段名本身作标签。

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `field` | `string` | 字段名（与 data / fields 对应） |
| `name` | `string` | 表头/面板显示名 |
| `description` | `string` | 说明文案（可被 UI 消费） |
| `formatter` | `MetaFormatter` | 单元格展示格式 |

#### `formatter`（`MetaFormatter`）

可为函数，或声明式 `FormatSpec`：

| `type` | 额外属性 | 用途 |
| --- | --- | --- |
| `number` | `precision?` `prefix?` `suffix?` | 数值格式 |
| `percent` | `precision?` | 百分比 |
| `currency` | `currency?` `precision?` | 货币（如 `CNY`） |
| `custom` | `id: string` | 自定义格式器 id |

```ts
meta: [
  {
    field: 'sales',
    name: '销售额',
    formatter: { type: 'currency', currency: 'CNY', precision: 0 },
  },
  {
    field: 'rate',
    name: '占比',
    formatter: (v) => `${(Number(v) * 100).toFixed(1)}%`,
  },
]
```

---

## RawDataCfg（明细模式）

明细行需要本地透视时使用。`dataKind` 可省略，等价于 `'raw'`。

| 属性 | 类型 | 必填 | 用途 |
| --- | --- | --- | --- |
| `dataKind` | `'raw'` | 否 | 显式声明明细模式 |
| `fields` | `PivotFields` | 是 | 字段布局 |
| `meta` | `FieldMeta[]` | 否 | 字段元数据 |
| `data` | `PivotRecord[]` | 否 | 明细行；每行是维度 + 度量的键值对象 |
| `preAggregated` | `PreAggregatedCell[]` | 否 | 可选预聚合格子，按维路径注入；**仅 raw** |

### `data`

明细记录数组。库会按 `fields` 交叉聚合。

```ts
const dataCfg: RawDataCfg = {
  // dataKind 可省略
  fields: {
    rows: ['province', 'city'],
    columns: ['type'],
    values: [{ field: 'number', aggregation: 'sum' }],
  },
  data: [
    { province: '浙江', city: '杭州', type: '笔', number: 10 },
    { province: '浙江', city: '杭州', type: '纸', number: 20 },
  ],
}
```

### `preAggregated`

按行列维路径提供已算好的指标值，可与明细并存（路径命中时优先使用）。**`aggregated` 模式禁止使用。**

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `rowPath` | `unknown[]` | 行维值路径（与 `fields.rows` 顺序一致） |
| `colPath` | `unknown[]` | 列维值路径（与 `fields.columns` 顺序一致） |
| `values` | `Record<field, unknown>` | 该交叉点的指标值 |

```ts
preAggregated: [
  {
    rowPath: ['浙江', '杭州'],
    colPath: ['笔'],
    values: { number: 100 },
  },
]
```

---

## AggregatedDataCfg（权威交叉结果）

服务端或上游已完成交叉聚合时使用。库**不会再调用聚合器**，只按 `fields` 建维树、定位单元格并渲染。

| 属性 | 类型 | 必填 | 用途 |
| --- | --- | --- | --- |
| `dataKind` | `'aggregated'` | 是 | 必须显式声明 |
| `fields` | `PivotFields` | 是 | 字段布局（决定维树结构） |
| `meta` | `FieldMeta[]` | 否 | 字段元数据 |
| `data` | `PivotRecord[]` | 是 | 完整叶子交叉格 |
| `totals` | `PivotRecord[]` | 否 | 总计宽表行 |
| `subTotals` | `AggregatedSubTotalRecord[]` | 否 | 小计宽表行 |
| `totalLabel` | `string` | 否 | 总计标签，默认 `Total` |
| `subTotalLabel` | `string` | 否 | 小计标签，默认 `Subtotal` |
| `aggregate` | `AggregateOptions` | 是 | 宽表契约与合计声明 |
| `fieldValues` | `Record<field, unknown[]>` | 否 | 筛选项枚举（不从格子推断） |

### `data`（叶子格）

每条记录必须包含全部 `fields.rows` 与 `fields.columns` 键；`null` 是合法维值。用「属性是否存在」区分缺失与 `null`。

```ts
data: [
  { region: 'East', category: 'Furniture', segment: 'Consumer', sales: 1200 },
]
```

### `totals` / `subTotals`

| 来源 | 含义 |
| --- | --- |
| `totals` | 总计：某轴维字段**缺失**表示该轴已汇总 |
| `subTotals` | 小计：必须带 `subTotalOn` + `subTotalAxis`；该维及之后同轴维必须缺失 |

```ts
interface AggregatedSubTotalRecord {
  subTotalOn: string           // 在哪个维上小计
  subTotalAxis: 'row' | 'column'
  // ...前缀维 + 指标
}
```

仅当 `aggregate.totals` **声明**了对应合计种类，且数组中有数据时才会渲染。明细模式下的合计由 `options.totals` 本地生成，与此无关。

### `aggregate: AggregateOptions`

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `shape` | `'wide'` | 宽表形态（首期仅此值） |
| `sparse` | `boolean` | 是否允许稀疏（缺叶不必补 0） |
| `duplicateCells` | `'error'` | 同坐标重复时的策略（首期仅报错） |
| `missingCell` | `'null'` | 缺格展示策略（首期仅 null） |
| `totals` | `{ row? / column? }` | 声明实际提供的合计种类；未声明却出现对应合计会报契约错误 |

`totals` 轴覆盖（`AggregateAxisCoverage`）：

| 属性 | 类型 | 用途 |
| --- | --- | --- |
| `grandTotal` | `boolean` | 是否提供该轴总计 |
| `subTotals` | `string[]` | 在哪些维上提供小计 |
| `treeNodes` | `boolean` | 是否提供树节点级合计 |

### `fieldValues`

aggregated 模式下筛选枚举**不会**从 `data` 自动推断，应通过本字段或组件 `filterFacets` 提供。

```ts
fieldValues: {
  region: ['East', 'West'],
  category: ['Furniture', 'Office'],
}
```

---

## 辅助函数

从 `@vue-pivot/core` / `@vue-pivot/vue` 导出：

| 函数 | 用途 |
| --- | --- |
| `isAggregatedDataCfg(cfg)` | 是否为 aggregated |
| `isRawDataCfg(cfg)` | 是否为 raw |
| `getDataKind(cfg)` | 返回 `'raw' \| 'aggregated'` |
| `normalizeMeasures(values)` | 将 `MeasureInput[]` 规范为 `MeasureField[]` |
| `listFieldCatalog(cfg)` | 列出已知字段名（data ∪ meta ∪ 已分区） |
| `listUnassignedFields(cfg)` | 未分配到 rows/columns/values/filters 的字段 |
| `listFieldValues(cfg, field)` | 某字段去重取值（aggregated 优先读 `fieldValues`） |

---

## 完整示例对照

### 明细

```ts
import type { RawDataCfg } from '@vue-pivot/core'

const dataCfg: RawDataCfg = {
  fields: {
    rows: ['province'],
    columns: ['type'],
    values: [{ field: 'number', aggregation: 'sum' }],
    valueInCols: true,
  },
  meta: [{ field: 'number', name: '数量', formatter: { type: 'number', precision: 0 } }],
  data: [
    { province: '浙江', type: '笔', number: 10 },
    { province: '浙江', type: '纸', number: 20 },
  ],
}
```

### 权威交叉

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
  data: [
    { region: 'East', category: 'Furniture', segment: 'Consumer', sales: 1200 },
  ],
  subTotals: [
    {
      region: 'East',
      segment: 'Consumer',
      sales: 1600,
      subTotalOn: 'category',
      subTotalAxis: 'row',
    },
  ],
  totals: [
    { segment: 'Consumer', sales: 3100 },
    { sales: 6000 },
  ],
  totalLabel: '合计',
  subTotalLabel: '小计',
  fieldValues: { region: ['East', 'West'] },
}
```
