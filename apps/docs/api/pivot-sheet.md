# PivotSheet

Vue 透视表组件。数据与布局见 [DataCfg](/api/data-cfg)，展示与交互见 [PivotOptions](/api/options)。

## Props

| 属性 | 类型 | 默认 | 用途 |
| --- | --- | --- | --- |
| `dataCfg` | [`DataCfg`](/api/data-cfg) | — | 数据与字段分区（必填） |
| `options` | [`PivotOptions`](/api/options) | `{}` | 展示形态、合计、交互、样式等 |
| `showFieldPanel` | `boolean` | `false` | 是否显示字段配置工具条 |
| `dataSource` | `PivotDataSource` | — | 可选远程数据源；`aggregated` 下查询变更可自动刷新 |
| `autoFetch` | `boolean` | `true` | 非 LocalDataSource 时自动 `refreshFromDataSource` |
| `filterFacets` | `Record<string, unknown[]>` | — | 筛选枚举（优先于从 `data` 推断；aggregated 常用） |

### `showFieldPanel` 行为

开启后显示字段配置工具条：

- **齿轮**：展开/收起字段面板（默认收起）。面板含未分配池 `available` 与 `rows` / `columns` / `values` / `filters` 四区拖拽；`values` 可选聚合（`sum` / `avg` / `count` / `min` / `max` / `distinctCount`）。
- **`filters` 区**：只配置筛选用字段（chip）。当该区有字段时，工具条出现**过滤**图标；点击后在工具条内以浮层展开筛选器（不占表格布局高度），按值多选并派发 `filter`（`operator: 'in'`）做聚合前过滤。拖出 filters 区会清除对应谓词。

## Events

| 事件 | 载荷 | 用途 |
| --- | --- | --- |
| `brushSelection` | `SelectionRange[]` | 框选结果（需 `options.interaction.brushSelection`） |
| `command` | `PivotCommand` | 内部命令外抛，含 `moveField`、`setMeasureAggregation`、`filter` 等 |
| `queryChange` | `PivotQuery` | 查询契约变更（受控取数可用） |
| `fetchError` | `{ error, queryId }` | 远程取数失败 |

## 状态 UI

| `status` | 表现 |
| --- | --- |
| `loading` | 表格 loading 遮罩 |
| `stale` | 查询契约已变、等待新权威结果 |
| `error` | 错误条 + 重试 |

## Headless

```ts
import { usePivotSheet } from '@vue-pivot/vue'

const { state, dispatch, table, viewport, selection, loading, refresh } = usePivotSheet({
  dataCfg,
  options,
  dataSource,
  autoFetch: true,
  onQueryChange: (q) => console.log(q),
})
```

## 相关导出

| 导出 | 用途 |
| --- | --- |
| `PivotFilterBar` | 表格上方值筛选条（一般由 `PivotSheet` 内部挂载） |
| `exportToCsv` / `exportToExcelXml` / `copySelection` / `downloadText` | 导出与剪贴板 |
| `createPivotEngine` / `ServerDataSource` / `buildPivotQuery` / `isAggregatedDataCfg` | 引擎与协议（亦从 `@vue-pivot/core` 导出） |
