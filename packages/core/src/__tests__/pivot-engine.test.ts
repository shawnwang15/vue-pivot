import { describe, expect, it } from 'vitest'
import { createPivotEngine } from '../engine/pivot-engine'
import type { DataCfg } from '../types/data-cfg'
import { listFieldValues, listUnassignedFields } from '../types/data-cfg'

const sample: DataCfg = {
  fields: {
    rows: ['province', 'city'],
    columns: ['type'],
    values: ['number'],
    valueInCols: true,
  },
  meta: [{ field: 'number', name: '数量' }],
  data: [
    { province: '浙江', city: '杭州', type: '笔', number: 10 },
    { province: '浙江', city: '杭州', type: '纸张', number: 20 },
    { province: '浙江', city: '舟山', type: '笔', number: 5 },
    { province: '吉林', city: '长春', type: '笔', number: 8 },
    { province: '吉林', city: '长春', type: '纸张', number: 12 },
  ],
}

describe('PivotEngine', () => {
  it('builds cross tabulation viewport', () => {
    const engine = createPivotEngine({
      dataCfg: sample,
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })
    const vp = engine.getViewport()
    expect(vp.rowCount).toBeGreaterThan(0)
    expect(vp.columnCount).toBeGreaterThan(0)
    const cell = vp.getCell(0, 0)
    expect(cell.measure).toBe('number')
    expect(typeof cell.formatted).toBe('string')
  })

  it('supports totals', () => {
    const engine = createPivotEngine({
      dataCfg: sample,
      options: {
        hierarchyType: 'grid',
        defaultExpandDepth: 2,
        totals: {
          row: { showGrandTotals: true },
          column: { showGrandTotals: true },
        },
      },
    })
    const rows = engine.getViewport().getRows()
    expect(rows.some((r) => r.kind === 'grandTotal')).toBe(true)
  })

  it('dispatch expand/collapse updates layout without dual state', () => {
    const engine = createPivotEngine({
      dataCfg: sample,
      options: { hierarchyType: 'tree', defaultExpandDepth: 0 },
    })
    const before = engine.getViewport().rowCount
    engine.dispatch({ type: 'expand', axis: 'row', path: ['浙江'] })
    const after = engine.getViewport().rowCount
    expect(after).toBeGreaterThanOrEqual(before)
  })

  it('moveField rebuilds axes', () => {
    const engine = createPivotEngine({ dataCfg: sample })
    engine.dispatch({ type: 'moveField', from: 'columns', to: 'rows', field: 'type' })
    expect(engine.getState().dataCfg.fields.rows).toContain('type')
    expect(engine.getState().dataCfg.fields.columns).not.toContain('type')
  })

  it('moveField to/from available virtual zone', () => {
    const engine = createPivotEngine({ dataCfg: sample })
    engine.dispatch({ type: 'moveField', from: 'columns', to: 'available', field: 'type' })
    const afterRemove = engine.getState().dataCfg
    expect(afterRemove.fields.columns).not.toContain('type')
    expect(afterRemove.fields.rows).not.toContain('type')
    expect(listUnassignedFields(afterRemove)).toContain('type')

    engine.dispatch({ type: 'moveField', from: 'available', to: 'rows', field: 'type' })
    expect(engine.getState().dataCfg.fields.rows).toContain('type')
    expect(listUnassignedFields(engine.getState().dataCfg)).not.toContain('type')
  })

  it('setMeasureAggregation updates values measure', () => {
    const engine = createPivotEngine({
      dataCfg: sample,
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })
    engine.dispatch({ type: 'setMeasureAggregation', field: 'number', aggregation: 'avg' })
    const measure = engine.getState().dataCfg.fields.values[0]
    expect(typeof measure === 'object' && measure.aggregation).toBe('avg')
    expect(engine.getState().measures[0]?.aggregation).toBe('avg')
    expect(engine.getViewport().columnCount).toBeGreaterThan(0)
  })

  it('listUnassignedFields returns catalog minus assigned', () => {
    const cfg: DataCfg = {
      fields: {
        rows: ['province'],
        columns: ['type'],
        values: ['number'],
      },
      meta: [{ field: 'number', name: '数量' }],
      data: [{ province: '浙江', city: '杭州', type: '笔', number: 10, extra: 1 }],
    }
    expect(listUnassignedFields(cfg)).toEqual(['city', 'extra'])
  })

  it('listFieldValues returns distinct sorted members from raw data', () => {
    expect(listFieldValues(sample, 'city')).toEqual(['杭州', '舟山', '长春'])
    expect(listFieldValues(sample, 'number')).toEqual([5, 8, 10, 12, 20])
  })

  it('moveField leaving filters clears matching FilterSpec', () => {
    const engine = createPivotEngine({
      dataCfg: {
        ...sample,
        fields: { ...sample.fields, filters: ['city'], rows: ['province'] },
      },
      options: {
        filters: [{ field: 'city', operator: 'in', value: ['杭州'] }],
      },
    })
    expect(engine.getState().filters).toHaveLength(1)
    engine.dispatch({ type: 'moveField', from: 'filters', to: 'available', field: 'city' })
    expect(engine.getState().dataCfg.fields.filters ?? []).not.toContain('city')
    expect(engine.getState().filters).toEqual([])
  })

  it('getWindow only materializes viewport', () => {
    const engine = createPivotEngine({
      dataCfg: sample,
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })
    const window = engine.getViewport().getWindow({
      rowStart: 0,
      rowEnd: 2,
      colStart: 0,
      colEnd: 2,
      overscanRow: 0,
      overscanCol: 0,
    })
    expect(window.cells.length).toBe(window.rows.length * window.columns.length)
  })

  it('brush selection stores normalized range', () => {
    const engine = createPivotEngine({
      dataCfg: sample,
      options: { interaction: { brushSelection: true, multiSelection: true } },
    })
    engine.dispatch({
      type: 'brushSelect',
      range: {
        start: { rowIndex: 2, colIndex: 1 },
        end: { rowIndex: 0, colIndex: 0 },
      },
    })
    const sel = engine.getState().selection[0]!
    expect(sel.start.rowIndex).toBe(0)
    expect(sel.end.rowIndex).toBe(2)
  })
})
