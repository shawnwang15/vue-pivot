# API 概览

| 包 | 职责 |
| --- | --- |
| `@vue-pivot/core` | 引擎、协议、DataSource、Worker |
| `@vue-pivot/table` | TanStack 适配 |
| `@vue-pivot/vue` | 组件与交互 |
| `@vue-pivot/charts` | ECharts 适配（peer） |

## 核心类型

| 文档 | 说明 |
| --- | --- |
| [DataCfg](/api/data-cfg) | 数据形态与字段布局（`RawDataCfg` / `AggregatedDataCfg`） |
| [PivotOptions](/api/options) | 展示、交互、合计、排序筛选与样式 |
| [PivotSheet](/api/pivot-sheet) | Vue 组件 Props、事件与 Headless API |
