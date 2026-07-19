# Architecture

```
dataCfg/options
    → @vue-pivot/core   (PivotQuery/Command, DimTree, Cube, Viewport)
    → @vue-pivot/table  (ColumnDef/HeaderGroup, manual state → PivotCommand)
    → @vue-pivot/vue    (四区 DOM + virtualizer + 交互)
    → @vue-pivot/charts (optional ECharts)
```

核心约束：

1. core 是透视状态唯一真源。
2. 不使用 TanStack `getGroupedRowModel` / aggregation / `expanded` 表达交叉透视。
3. DataGrid 是唯一滚动容器；表头通过 transform 同步。
