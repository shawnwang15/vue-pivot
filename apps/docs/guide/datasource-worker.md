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

## Worker 边界

Worker 只接收 structured-clone 安全数据：

- query / records / aggregator IDs / 声明式 format spec
- formatter 函数、Vue slot、cell renderer 留在主线程

本地、Worker、服务端共享 `init/add/merge/finalize` 聚合协议。
