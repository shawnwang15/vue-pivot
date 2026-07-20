# PivotSheet

## Props

- `dataCfg: DataCfg`
- `options?: PivotOptions`
- `showFieldPanel?: boolean` — 开启后显示字段配置工具条。
  - 齿轮：展开/收起字段面板（默认收起）。面板含未分配池 `available` 与 `rows` / `columns` / `values` / `filters` 四区拖拽；`values` 可选聚合（`sum` / `avg` / `count` / `min` / `max` / `distinctCount`）。
  - `filters` 区只配置筛选用字段（chip）。当该区有字段时，工具条（`.vp-field-toolbar`）出现**过滤**图标；点击后在工具条内以浮层展开筛选器（不占表格布局高度），按值多选并派发 `filter`（`operator: 'in'`）做聚合前过滤。拖出 filters 区会清除对应谓词。

## Events

- `brushSelection`
- `command` — 含 `moveField`（可进出 `available`）、`setMeasureAggregation`、`filter` 等

## Headless

```ts
import { usePivotSheet } from '@vue-pivot/vue'

const { state, dispatch, table, viewport, selection } = usePivotSheet({ dataCfg, options })
```

## Exports

- `PivotFilterBar` — 表格上方值筛选条（一般由 `PivotSheet` 内部挂载）
- `exportToCsv` / `exportToExcelXml` / `copySelection` / `downloadText`
