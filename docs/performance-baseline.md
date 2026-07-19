# 性能基线（PoC 后冻结）

## 场景

| 场景 | 规模 | 关注指标 |
|---|---|---|
| 明细聚合 | 10 万行明细 | 首屏、峰值内存、缓存命中 |
| 逻辑矩阵 | 5k × 200 | 首屏、快速滚动帧率、长任务 |
| 展开折叠 | Superstore tree | 交互延迟、局部失效 |
| Worker | 同明细 | 主线程阻塞、结果一致性 |
| 服务端查询 | mock latency | 竞态丢弃、取消 |

## PoC 验收门槛（相对阈值，非单机绝对值）

- 5k×200 逻辑矩阵：首屏可交互（虚拟窗口已挂载）目标 < 1.5s（开发机参考）。
- 快速滚动：无明显白屏空洞；overscan 随速度自适应。
- 展开/折叠：不触发全量 records 重扫以外的不必要 cube 全清（layout-only 路径）。
- CI：相对上次 main 基线回归阈值 20%（首屏/交互 p95）。

## 采集方法

Playground `/poc` 输出 `firstPaintMs`、逻辑行列数；Vitest bench 覆盖聚合/merge；Playwright 覆盖滚动同步烟测。

正式数字在 PoC 合入后写入本文件的 “Frozen targets” 小节。

## Frozen targets

| Metric | Target | Notes |
|---|---|---|
| PoC first paint | <= 1500ms | local reference machine |
| 100k detail rebuild | <= 3000ms | LocalDataSource path |
| Scroll sync drift | 0px | corner/headers transform only |
