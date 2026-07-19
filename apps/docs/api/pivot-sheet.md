# PivotSheet

## Props

- `dataCfg: DataCfg`
- `options?: PivotOptions`
- `showFieldPanel?: boolean`

## Events

- `brushSelection`
- `command`

## Headless

```ts
import { usePivotSheet } from '@vue-pivot/vue'

const { state, dispatch, table, viewport, selection } = usePivotSheet({ dataCfg, options })
```

## Exports

- `exportToCsv` / `exportToExcelXml` / `copySelection` / `downloadText`
