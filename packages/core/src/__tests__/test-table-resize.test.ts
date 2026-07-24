import { describe, expect, it } from 'vitest'
import { createPivotEngine } from '../engine/pivot-engine'

const tableCfg = {
  sheetType: 'table' as const,
  fields: {
    rows: [],
    columns: ['category', 'region', 'sales'],
    values: [],
  },
  meta: [
    { field: 'category', name: '品类' },
    { field: 'region', name: '区域' },
    { field: 'sales', name: '销售额' },
  ],
  data: [
    { category: 'Furniture', region: 'East', sales: 100 },
    { category: 'Furniture', region: 'East', sales: 50 },
    { category: 'Office', region: 'West', sales: 80 },
  ],
}

describe('table resize', () => {
  it('resizeColumn updates column width in table mode', () => {
    const engine = createPivotEngine({ dataCfg: tableCfg })
    const vp = engine.getViewport()
    const col0 = vp.getColumn(0)
    console.log('before resize, col0 width:', col0.width)
    
    engine.dispatch({ type: 'resizeColumn', columnId: col0.columnId, width: 200 })
    
    const vp2 = engine.getViewport()
    const col0After = vp2.getColumn(0)
    console.log('after resize, col0 width:', col0After.width)
    expect(col0After.width).toBe(200)
  })
})
