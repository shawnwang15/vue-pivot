import { describe, expect, it } from 'vitest'
import { avgAggregator, sumAggregator } from '../engine/aggregator'
import { applyPreFilters, applyTopN } from '../engine/filter-sort'
import { createPivotEngine } from '../engine/pivot-engine'

function randomRecords(n: number) {
  const out = []
  for (let i = 0; i < n; i++) {
    out.push({
      a: `g${i % 5}`,
      b: `c${i % 3}`,
      v: i,
    })
  }
  return out
}

describe('property-like invariants', () => {
  it('sum merge is associative for random partitions', () => {
    const values = Array.from({ length: 50 }, (_, i) => i)
    const mid = 20
    const left = sumAggregator.init()
    const right = sumAggregator.init()
    values.slice(0, mid).forEach((v) => sumAggregator.add(left, v))
    values.slice(mid).forEach((v) => sumAggregator.add(right, v))
    sumAggregator.merge(left, right)
    const direct = sumAggregator.init()
    values.forEach((v) => sumAggregator.add(direct, v))
    expect(sumAggregator.finalize(left)).toBe(sumAggregator.finalize(direct))
  })

  it('avg merge matches direct finalize', () => {
    const values = [1, 2, 3, 4, 5, 6]
    const a = avgAggregator.init()
    const b = avgAggregator.init()
    values.slice(0, 2).forEach((v) => avgAggregator.add(a, v))
    values.slice(2).forEach((v) => avgAggregator.add(b, v))
    avgAggregator.merge(a, b)
    const d = avgAggregator.init()
    values.forEach((v) => avgAggregator.add(d, v))
    expect(avgAggregator.finalize(a)).toBe(avgAggregator.finalize(d))
  })

  it('pre-filter then topN is deterministic', () => {
    const records = randomRecords(40)
    const filtered = applyPreFilters(records, [{ field: 'a', operator: 'in', value: ['g0', 'g1'] }])
    const top = applyTopN(filtered, [{ field: 'a', n: 1, measure: 'v', order: 'desc' }])
    const top2 = applyTopN(filtered, [{ field: 'a', n: 1, measure: 'v', order: 'desc' }])
    expect(top).toEqual(top2)
  })

  it('viewport cell values stable across repeated getCell', () => {
    const engine = createPivotEngine({
      dataCfg: {
        fields: { rows: ['a'], columns: ['b'], values: ['v'], valueInCols: true },
        data: randomRecords(30),
      },
      options: { hierarchyType: 'grid', defaultExpandDepth: 2 },
    })
    const vp = engine.getViewport()
    const a = vp.getCell(0, 0)
    const b = vp.getCell(0, 0)
    expect(a.value).toEqual(b.value)
    expect(a.formatted).toEqual(b.formatted)
  })
})
