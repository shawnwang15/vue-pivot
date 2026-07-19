import { bench, describe } from 'vitest'
import { createPivotEngine } from '@vue-pivot/core'

function makeRecords(n: number) {
  const records = []
  for (let i = 0; i < n; i++) {
    records.push({
      province: `P${i % 50}`,
      city: `C${i % 200}`,
      type: `T${i % 20}`,
      number: i % 97,
    })
  }
  return records
}

describe('pivot engine benches', () => {
  bench('rebuild 10k detail grid', () => {
    createPivotEngine({
      dataCfg: {
        fields: {
          rows: ['province', 'city'],
          columns: ['type'],
          values: ['number'],
          valueInCols: true,
        },
        data: makeRecords(10_000),
      },
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })
  })

  bench('getWindow 40x20 on medium matrix', () => {
    const engine = createPivotEngine({
      dataCfg: {
        fields: {
          rows: ['province', 'city'],
          columns: ['type'],
          values: ['number'],
          valueInCols: true,
        },
        data: makeRecords(20_000),
      },
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })
    engine.getViewport().getWindow({
      rowStart: 0,
      rowEnd: 40,
      colStart: 0,
      colEnd: 20,
    })
  })
})
