# Migration from S2

```ts
import { fromS2DataCfg, fromS2Options } from '@vue-pivot/core'

const dataCfg = fromS2DataCfg(s2DataCfg)
const options = fromS2Options(s2Options)
```

对照表见 [Capability matrix](./capability-matrix.md)。

差异：

- 公开类型是 vue-pivot 语义，不是 S2 内部对象拷贝
- DOM 渲染而非 Canvas
- 首期无 SSR / 编辑回写
- S2 `TableSheet`：用 `sheetType: 'table'`（`fromS2DataCfg` 在 columns 非空且 rows/values 皆空时会自动推断）；见 [明细表 Table](./table-sheet.md)
