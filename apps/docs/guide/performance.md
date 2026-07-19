# Performance

- 惰性 Cube：只缓存访问过的祖先组合与 totals
- `getWindow` 只物化 viewport + overscan
- 二维虚拟化 + 自适应 overscan
- 大数据优先服务端聚合或 Worker
- 详见仓库 [`docs/performance-baseline.md`](../../../docs/performance-baseline.md)
