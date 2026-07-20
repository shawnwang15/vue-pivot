# S2 / VTable 能力矩阵

“完整对标”= 核心分析能力覆盖。不承诺 Canvas 百万单元格性能或逐像素兼容。

| 能力 | 目标 API | S2 | VTable | vue-pivot | 验收 | 版本 |
|---|---|---|---|---|---|---|
| rows/columns/values | `dataCfg.fields` | Y | Y | Y | unit: pivot-engine | 0.1 |
| valueInCols | `fields.valueInCols` | Y | Y | Y | unit | 0.1 |
| meta/formatter | `dataCfg.meta` | Y | Y | Y | unit | 0.1 |
| 计算/派生指标 | `options.derivedMeasures` | Y | 部分 | Y (ratio/rank/yoy stub) | unit | 0.1 |
| 行列小计/总计 | `options.totals` | Y | Y | Y | unit | 0.1 |
| 同比/环比/占比/排名 | derived + server | Y | Y | Y (占比/排名本地，同比服务端) | unit/demo | 0.1 |
| 空值/精度 | `options.nullPrecision` | Y | Y | Y | unit | 0.1 |
| hierarchy grid/tree/grid-tree | `options.hierarchyType` | Y | Y | Y | e2e | 0.1 |
| 预构建维树 | DataSource/result trees | Y | Y | Y (ingest) | unit | 0.1 |
| 默认展开/异步展开 | expandDepth / drill | Y | Y | Y | e2e | 0.1 |
| 前置/后置过滤 | `filters.postAggregation` | Y | Y | Y | unit | 0.1 |
| 排序 / Top N | `sort` / `topN` | Y | Y | Y | unit | 0.1 |
| 冻结 | style.frozen* + pinColumn | Y | Y | Y | e2e | 0.1 |
| 刷选/多选区 | brushSelect | Y | Y | Y | e2e | 0.1 |
| tooltip | PivotTooltip | Y | Y | Y | demo | 0.1 |
| 下钻/上卷 | drillDown/rollUp | Y | Y | Y | e2e | 0.1 |
| 字段拖拽 | PivotFieldPanel | Y | Y | Y | e2e | 0.1 |
| 列宽/隐藏/重排 | column UI commands | Y | Y | Y | unit | 0.1 |
| 条件格式/interval/icon | conditions | Y | Y | Y | demo | 0.1 |
| 迷你图/透视图 | @vue-pivot/charts | Y | Y | Y | demo | 0.1 |
| 主题 token | CSS variables | Y | Y | Y | visual | 0.1 |
| 自定义单元格 slot | #data-cell 等 | Y | 部分 | Y | demo | 0.1 |
| 本地明细 | LocalDataSource | Y | Y | Y | unit | 0.1 |
| 预聚合 | dataCfg.preAggregated | Y | Y | Y | unit | 0.1 |
| 权威交叉结果 | dataKind: aggregated + totals/subTotals | Y | Y | Y | unit/demo | 0.1 |
| 服务端 DataSource | ServerDataSource | Y | Y | Y | unit/demo | 0.1 |
| Worker | WorkerExecutor | 部分 | 部分 | Y | unit | 0.1 |
| 复制 / CSV / Excel | export helpers | Y | Y | Y | e2e | 0.1 |
| SSR | — | N/A | N/A | **非目标** | — | — |
| 单元格编辑回写 | — | 部分 | 部分 | **后续** | — | — |

## 行为差异摘要

- DOM + Vue slot，定制与 a11y 成本低于 Canvas。
- 极限百万单元格弱于 VTable/S2；依赖虚拟化 + Worker + 服务端聚合。
- 公开类型为本库语义；提供 `fromS2DataCfg()` 迁移，不复制 S2 内部对象。
- TanStack 不承担交叉透视计算，禁止 `getGroupedRowModel` 双重语义。
