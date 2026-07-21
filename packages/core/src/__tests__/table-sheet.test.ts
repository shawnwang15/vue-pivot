import { describe, expect, it } from 'vitest'
import { createPivotEngine } from '../engine/pivot-engine'
import { fromS2DataCfg } from '../migrate/from-s2'
import { buildPivotQuery } from '../query/build-query'
import type { AggregatedDataCfg, RawDataCfg } from '../types/data-cfg'
import { assertValidSheetCfg, getSheetType, isTableSheet } from '../types/data-cfg'

const tableCfg: RawDataCfg = {
  sheetType: 'table',
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

describe('sheetType: table', () => {
  it('renders one row per record without aggregating duplicates', () => {
    const engine = createPivotEngine({ dataCfg: tableCfg })
    const vp = engine.getViewport()
    expect(vp.rowCount).toBe(3)
    expect(vp.columnCount).toBe(3)
    expect(vp.getCell(0, 0).value).toBe('Furniture')
    expect(vp.getCell(0, 1).value).toBe('East')
    expect(vp.getCell(0, 2).value).toBe(100)
    expect(vp.getCell(1, 2).value).toBe(50)
    expect(vp.getColumns().map((c) => c.label)).toEqual(['品类', '区域', '销售额'])
  })

  it('sorts by display field (alpha)', () => {
    const engine = createPivotEngine({ dataCfg: tableCfg })
    engine.dispatch({
      type: 'sort',
      sort: [{ field: 'sales', order: 'desc', method: 'alpha' }],
    })
    const vp = engine.getViewport()
    expect(vp.getCell(0, 2).value).toBe(100)
    expect(vp.getCell(1, 2).value).toBe(80)
    expect(vp.getCell(2, 2).value).toBe(50)
  })

  it('applies pre-filters to detail rows', () => {
    const engine = createPivotEngine({ dataCfg: tableCfg })
    engine.dispatch({
      type: 'filter',
      filters: [{ field: 'region', operator: 'eq', value: 'East' }],
    })
    expect(engine.getViewport().rowCount).toBe(2)
  })

  it('ignores moveField into rows/values', () => {
    const engine = createPivotEngine({ dataCfg: tableCfg })
    engine.dispatch({ type: 'moveField', from: 'columns', to: 'rows', field: 'category' })
    expect(engine.getState().dataCfg.fields.rows).toEqual([])
    expect(engine.getState().dataCfg.fields.columns).toContain('category')
  })

  it('rejects aggregated + table', () => {
    const cfg = {
      dataKind: 'aggregated',
      sheetType: 'table',
      fields: { rows: [], columns: ['a'], values: [] },
      aggregate: { shape: 'wide' as const },
      data: [{ a: 1 }],
    } as unknown as AggregatedDataCfg
    expect(() => assertValidSheetCfg(cfg)).toThrow(/incompatible/)
    expect(() => createPivotEngine({ dataCfg: cfg })).toThrow(/incompatible/)
  })

  it('rejects non-empty rows/values in table mode', () => {
    const cfg: RawDataCfg = {
      sheetType: 'table',
      fields: { rows: ['region'], columns: ['category'], values: ['sales'] },
      data: [],
    }
    expect(() => assertValidSheetCfg(cfg)).toThrow(/empty fields\.rows/)
  })

  it('exposes sheetType on PivotQuery', () => {
    const engine = createPivotEngine({ dataCfg: tableCfg })
    const query = buildPivotQuery(engine.getState())
    expect(query.sheetType).toBe('table')
    expect(query.axes.rows).toEqual([])
    expect(query.measures).toEqual([])
  })

  it('maps S2 TableSheet-like cfg via fromS2DataCfg', () => {
    const cfg = fromS2DataCfg({
      fields: { rows: [], columns: ['category', 'region'], values: [] },
      data: [{ category: 'A', region: 'E' }],
    })
    expect(isTableSheet(cfg)).toBe(true)
    expect(getSheetType(cfg)).toBe('table')
    const engine = createPivotEngine({ dataCfg: cfg })
    expect(engine.getViewport().rowCount).toBe(1)
  })

  it('defaults to pivot when sheetType omitted', () => {
    const engine = createPivotEngine({
      dataCfg: {
        fields: {
          rows: ['region'],
          columns: ['category'],
          values: ['sales'],
        },
        data: [
          { region: 'East', category: 'Furniture', sales: 10 },
          { region: 'East', category: 'Furniture', sales: 5 },
        ],
      },
    })
    expect(getSheetType(engine.getState().dataCfg)).toBe('pivot')
    // Same dim path aggregates
    expect(engine.getViewport().getCell(0, 0).value).toBe(15)
  })
})
