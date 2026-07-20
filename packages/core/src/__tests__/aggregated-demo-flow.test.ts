import { describe, expect, it } from 'vitest'
import { createPivotEngine } from '../engine/pivot-engine'
import type { PivotDataSource, PivotRecord } from '../types'

const LEAVES: PivotRecord[] = [
  {
    region: 'East',
    category: 'Furniture',
    segment: 'Consumer',
    sales: 1200,
    profit: 180,
  },
]

describe('aggregated demo flow', () => {
  it('survives setOptions after refresh with autoFetch', async () => {
    const ds: PivotDataSource = {
      capabilities: () => ({
        serverAggregation: true,
        drill: false,
        topN: true,
        totals: true,
        asyncExpand: false,
        worker: false,
        streaming: false,
        supportedAggregators: ['sum'],
      }),
      async query(request) {
        return {
          queryId: request.queryId,
          rowTreeVersion: 1,
          colTreeVersion: 1,
          aggregate: {
            shape: 'wide',
            totals: {
              row: { grandTotal: true, subTotals: ['category'] },
              column: { grandTotal: true },
            },
          },
          records: LEAVES,
          subTotals: [
            {
              region: 'East',
              segment: 'Consumer',
              sales: 1600,
              profit: 220,
              subTotalOn: 'category',
              subTotalAxis: 'row' as const,
            },
          ],
          totals: [{ sales: 6000, profit: 1040 }],
        }
      },
    }
    const engine = createPivotEngine({
      dataCfg: {
        dataKind: 'aggregated',
        fields: {
          rows: ['region', 'category'],
          columns: ['segment'],
          values: [
            { field: 'sales', aggregation: 'sum' },
            { field: 'profit', aggregation: 'sum' },
          ],
          valueInCols: true,
        },
        aggregate: {
          shape: 'wide',
          totals: {
            row: { grandTotal: true, subTotals: ['category'] },
            column: { grandTotal: true },
          },
        },
        data: [],
      },
      dataSource: ds,
      autoFetch: true,
      options: {
        hierarchyType: 'grid',
        defaultExpandDepth: 2,
        totals: {
          row: { showGrandTotals: true, showSubTotals: true, subTotalsDimensions: ['category'] },
          column: { showGrandTotals: true },
        },
      },
    })
    await engine.refreshFromDataSource()
    expect(engine.getViewport().rowCount).toBeGreaterThan(0)
    expect(engine.getViewport().getCell(0, 0).value).toBe(1200)

    engine.dispatch({
      type: 'setOptions',
      options: {
        hierarchyType: 'grid',
        defaultExpandDepth: 2,
        totals: {
          row: { showGrandTotals: true, showSubTotals: true, subTotalsDimensions: ['category'] },
          column: { showGrandTotals: true },
        },
        interaction: { brushSelection: true },
        style: { rowHeight: 32, colWidth: 110 },
      },
    })
    await new Promise((r) => setTimeout(r, 50))
    expect(engine.getState().status).toBe('success')
    expect(engine.getViewport().rowCount).toBeGreaterThan(0)
  })
})
