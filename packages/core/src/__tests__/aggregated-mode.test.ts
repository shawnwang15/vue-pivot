import { describe, expect, it, vi } from 'vitest'
import { createPivotEngine } from '../engine/pivot-engine'
import type { AggregatedDataCfg, PivotRecord } from '../types/data-cfg'
import { registerAggregator } from '../engine/aggregator'
import { AggregatedContractError, buildAggregatedResult } from '../engine/server-result'
import type { PivotDataSource } from '../datasource/pivot-data-source'
import type { PivotQuery, PivotResult } from '../types/pivot-query'

const leaf = (
  region: string,
  city: string | null,
  category: string,
  measures: Record<string, unknown>,
): PivotRecord => ({
  region,
  city,
  category,
  ...measures,
})

const baseCfg: AggregatedDataCfg = {
  dataKind: 'aggregated',
  fields: {
    rows: ['region', 'city'],
    columns: ['category'],
    values: [
      { field: 'sales', aggregation: 'sum' },
      { field: 'avgPrice', aggregation: 'avg' },
    ],
    valueInCols: true,
  },
  aggregate: {
    shape: 'wide',
    sparse: true,
    totals: {
      row: { grandTotal: true, subTotals: ['city'] },
      column: { grandTotal: true },
    },
  },
  data: [
    leaf('East', 'Boston', 'Furniture', { sales: 100, avgPrice: 10 }),
    leaf('East', 'NYC', 'Furniture', { sales: 50, avgPrice: 20 }),
  ],
  subTotals: [
    {
      region: 'East',
      category: 'Furniture',
      sales: 150,
      avgPrice: 15,
      subTotalOn: 'city',
      subTotalAxis: 'row',
    },
  ],
  totals: [
    { category: 'Furniture', sales: 150, avgPrice: 15 },
    { sales: 150, avgPrice: 15 },
  ],
}

describe('aggregated dataKind', () => {
  it('renders leaf cells without aggregation', () => {
    const engine = createPivotEngine({
      dataCfg: baseCfg,
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })
    const vp = engine.getViewport()
    expect(vp.rowCount).toBeGreaterThan(0)
    const rows = vp.getRows()
    expect(rows.some((r) => r.kind === 'subTotal')).toBe(true)
    expect(rows.some((r) => r.kind === 'grandTotal')).toBe(true)

    const boston = rows.find((r) => r.label === 'Boston')
    expect(boston).toBeTruthy()
    const cols = vp.getColumns()
    const furnitureSales = cols.find((c) => c.measure === 'sales' && c.label === 'sales')
    expect(furnitureSales).toBeTruthy()
    const furnitureCol =
      cols.find((c) => c.measure === 'sales' && c.path.some((p) => p.includes('Furniture'))) ??
      furnitureSales
    const value = vp.getCell(boston!.index, furnitureCol!.index).value
    expect(value).toBe(100)
  })

  it('keeps avg authoritative (no client re-aggregate)', () => {
    const engine = createPivotEngine({
      dataCfg: baseCfg,
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })
    const vp = engine.getViewport()
    const sub = vp.getRows().find((r) => r.kind === 'subTotal')!
    const col = vp.getColumns().find((c) => c.measure === 'avgPrice')!
    expect(vp.getCell(sub.index, col.index).value).toBe(15)
  })

  it('does not render totals headers when totals/subTotals arrays absent', () => {
    const cfg: AggregatedDataCfg = {
      ...baseCfg,
      aggregate: { shape: 'wide' },
      data: [leaf('East', 'Boston', 'Furniture', { sales: 1, avgPrice: 1 })],
      subTotals: undefined,
      totals: undefined,
    }
    const engine = createPivotEngine({
      dataCfg: cfg,
      options: {
        hierarchyType: 'grid',
        defaultExpandDepth: 2,
        totals: { row: { showGrandTotals: true } },
      },
    })
    expect(engine.getViewport().getRows().some((r) => r.kind === 'grandTotal')).toBe(false)
  })

  it('rejects undeclared grandTotal records', () => {
    const cfg: AggregatedDataCfg = {
      ...baseCfg,
      aggregate: { shape: 'wide' },
      data: [leaf('East', 'Boston', 'Furniture', { sales: 1 })],
      subTotals: undefined,
      totals: [{ category: 'Furniture', sales: 1 }],
    }
    expect(() =>
      buildAggregatedResult({
        dataCfg: cfg,
        hierarchyType: 'grid',
        expandDepth: 2,
        expandedRowPaths: [],
        expandedColPaths: [],
      }),
    ).toThrow(AggregatedContractError)
  })

  it('rejects leaf rows missing a dimension field', () => {
    const cfg: AggregatedDataCfg = {
      ...baseCfg,
      aggregate: { shape: 'wide' },
      data: [{ region: 'East', category: 'Furniture', sales: 1 }],
      subTotals: undefined,
      totals: undefined,
    }
    expect(() =>
      buildAggregatedResult({
        dataCfg: cfg,
        hierarchyType: 'grid',
        expandDepth: 2,
        expandedRowPaths: [],
        expandedColPaths: [],
      }),
    ).toThrow(/leaf requires all axis fields/)
  })

  it('treats null dimension values as valid leaves', () => {
    const cfg: AggregatedDataCfg = {
      dataKind: 'aggregated',
      fields: {
        rows: ['region', 'city'],
        columns: ['category'],
        values: ['sales'],
        valueInCols: true,
      },
      aggregate: { shape: 'wide' },
      data: [leaf('East', null, 'Furniture', { sales: 7 })],
    }
    const engine = createPivotEngine({
      dataCfg: cfg,
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })
    expect(engine.getViewport().getCell(0, 0).value).toBe(7)
    expect(engine.getViewport().getRows().some((r) => r.label === '(null)')).toBe(true)
  })

  it('distinguishes number 1 and string "1"', () => {
    const cfg: AggregatedDataCfg = {
      dataKind: 'aggregated',
      fields: {
        rows: ['id'],
        columns: [],
        values: ['v'],
        valueInCols: true,
      },
      aggregate: { shape: 'wide' },
      data: [
        { id: 1, v: 10 },
        { id: '1', v: 20 },
      ],
    }
    const engine = createPivotEngine({
      dataCfg: cfg,
      options: { hierarchyType: 'grid', defaultExpandDepth: 1 },
    })
    expect(engine.getViewport().rowCount).toBe(2)
    const values = [0, 1].map((i) => engine.getViewport().getCell(i, 0).value).sort()
    expect(values).toEqual([10, 20])
  })

  it('never calls aggregators in aggregated mode', () => {
    const boom = {
      id: 'boomAgg',
      init: () => {
        throw new Error('aggregator should not run')
      },
      add: () => {
        throw new Error('aggregator should not run')
      },
      merge: () => {
        throw new Error('aggregator should not run')
      },
      finalize: () => {
        throw new Error('aggregator should not run')
      },
    }
    registerAggregator(boom as never)
    const cfg: AggregatedDataCfg = {
      ...baseCfg,
      fields: {
        ...baseCfg.fields,
        values: [{ field: 'sales', aggregation: 'boomAgg' }],
      },
      data: [leaf('East', 'Boston', 'Furniture', { sales: 42 })],
      subTotals: undefined,
      totals: undefined,
      aggregate: { shape: 'wide' },
    }
    const engine = createPivotEngine({
      dataCfg: cfg,
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })
    expect(engine.getViewport().getCell(0, 0).value).toBe(42)
  })

  it('marks stale and clears data/totals/subTotals on field move', () => {
    const engine = createPivotEngine({
      dataCfg: baseCfg,
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
      autoFetch: false,
    })
    expect(engine.getViewport().rowCount).toBeGreaterThan(0)
    engine.dispatch({ type: 'moveField', from: 'columns', to: 'rows', field: 'category' })
    expect(engine.getState().status).toBe('stale')
    expect(engine.getState().dataCfg.fields.rows).toContain('category')
    const cfg = engine.getState().dataCfg as AggregatedDataCfg
    expect(cfg.data).toEqual([])
    expect(cfg.totals).toBeUndefined()
    expect(cfg.subTotals).toBeUndefined()
  })

  it('refreshFromDataSource applies leaf/totals arrays', async () => {
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
      async query(request: PivotQuery, _signal: AbortSignal): Promise<PivotResult> {
        return {
          queryId: request.queryId,
          rowTreeVersion: 1,
          colTreeVersion: 1,
          aggregate: { shape: 'wide' },
          records: [leaf('West', 'SF', 'Tech', { sales: 9, avgPrice: 3 })],
        }
      },
    }

    const engine = createPivotEngine({
      dataCfg: {
        ...baseCfg,
        data: [],
        subTotals: undefined,
        totals: undefined,
        aggregate: { shape: 'wide' },
      },
      dataSource: ds,
      autoFetch: false,
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })

    await engine.refreshFromDataSource()
    expect(engine.getState().status).toBe('success')
    expect(engine.getViewport().getCell(0, 0).value).toBe(9)
  })

  it('emits queryChange on aggregated contract edits', () => {
    const engine = createPivotEngine({
      dataCfg: baseCfg,
      autoFetch: false,
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })
    const spy = vi.fn()
    engine.onQueryChange(spy)
    engine.dispatch({ type: 'setMeasureAggregation', field: 'sales', aggregation: 'avg' })
    expect(spy).toHaveBeenCalled()
    expect(spy.mock.calls[0]![0].dataKind).toBe('aggregated')
  })

  it('rejects duplicate cell coordinates', () => {
    const cfg: AggregatedDataCfg = {
      dataKind: 'aggregated',
      fields: { rows: ['a'], columns: [], values: ['v'] },
      aggregate: { shape: 'wide' },
      data: [
        { a: 'x', v: 1 },
        { a: 'x', v: 2 },
      ],
    }
    expect(() =>
      buildAggregatedResult({
        dataCfg: cfg,
        hierarchyType: 'grid',
        expandDepth: 1,
        expandedRowPaths: [],
        expandedColPaths: [],
      }),
    ).toThrow(/duplicate cell/)
  })

  it('accepts playground mock-shaped data/totals/subTotals', () => {
    const cfg: AggregatedDataCfg = {
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
        sparse: true,
        totals: {
          row: { grandTotal: true, subTotals: ['category'] },
          column: { grandTotal: true },
        },
      },
      data: [
        {
          region: 'East',
          category: 'Furniture',
          segment: 'Consumer',
          sales: 1200,
          profit: 180,
        },
      ],
      subTotals: [
        {
          region: 'East',
          segment: 'Consumer',
          sales: 1600,
          profit: 220,
          subTotalOn: 'category',
          subTotalAxis: 'row',
        },
      ],
      totals: [
        { segment: 'Consumer', sales: 3100, profit: 440 },
        { sales: 6000, profit: 1040 },
      ],
    }
    const built = buildAggregatedResult({
      dataCfg: cfg,
      hierarchyType: 'grid',
      expandDepth: 2,
      expandedRowPaths: [],
      expandedColPaths: [],
    })
    expect(built.serverCells.cells.size).toBeGreaterThan(0)
    expect([...built.rowTree.nodes.values()].some((n) => n.kind === 'subTotal')).toBe(true)
    expect([...built.rowTree.nodes.values()].some((n) => n.kind === 'grandTotal')).toBe(true)
  })
})
