# DataSource & Worker

## PivotDataSource

```ts
interface PivotDataSource {
  query(request: PivotQuery, signal: AbortSignal): Promise<PivotResult>
  drill?(request: DrillQuery, signal: AbortSignal): Promise<DrillResult>
  capabilities(): DataSourceCapabilities
}
```

- 内置 `LocalDataSource`、`ServerDataSource`
- 请求支持取消、queryId、竞态丢弃
- `PivotQuery.dataKind`：`raw` | `aggregated`

## Aggregated 模式

当 `dataKind: 'aggregated'` 时，`PivotResult` 应返回权威宽表：

- `records`：完整叶子（所有 row/column 维字段都在）
- `subTotals` / `totals`：小计 / 总计（可选）
- `aggregate`：覆盖声明（totals / sparse）
- `fieldValues`：筛选枚举

引擎会原子写入 `dataCfg.data` / `totals` / `subTotals` 并走纯查找路径，**不再本地聚合**。详见 [Aggregated mode](./aggregated-mode.md)。

`ServerDataSource` 默认声明 `serverAggregation: true`，请求体为：

```json
{ "type": "query", "request": { /* PivotQuery */ } }
```

## Worker 边界

Worker 只接收 structured-clone 安全数据：

- query / records / aggregator IDs / 声明式 format spec
- formatter 函数、Vue slot、cell renderer 留在主线程

本地、Worker 共享 `init/add/merge/finalize` 聚合协议（仅 `raw` 模式）。

**`dataKind: 'aggregated'` 与 `useWorker` 不兼容。**
