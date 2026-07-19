# vue-pivot

基于 DOM、`@tanstack/vue-table` 与 `@tanstack/vue-virtual` 的 Vue 透视表组件库。

自研惰性透视内核（`@vue-pivot/core`）作为唯一状态源，对标 `@antv/s2` / `@visactor/vtable` 的核心分析能力；首期不支持 SSR。

## Packages

| Package | Description |
|---|---|
| `@vue-pivot/core` | Query/command、维树、聚合、惰性 Cube、DataSource/Worker |
| `@vue-pivot/table` | TanStack 手动状态适配 |
| `@vue-pivot/vue` | 四区 DOM 组件与交互 |
| `@vue-pivot/charts` | ECharts 迷你图/透视图（peer） |

## Develop

```bash
pnpm install
pnpm dev          # playground
pnpm test
pnpm build
pnpm docs:dev
```

## Docs

- [Capability matrix](./docs/capability-matrix.md)
- [Performance baseline](./docs/performance-baseline.md)
- VitePress: `apps/docs`

## License

MIT
