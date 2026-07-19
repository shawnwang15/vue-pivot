import { describe, expect, it } from 'vitest'
import {
  avgAggregator,
  distinctCountAggregator,
  getAggregator,
  serializeAggregatorState,
  deserializeAggregatorState,
  sumAggregator,
} from '../engine/aggregator'

describe('aggregators', () => {
  it('sum merges partials', () => {
    const a = sumAggregator.init()
    const b = sumAggregator.init()
    sumAggregator.add(a, 1)
    sumAggregator.add(a, 2)
    sumAggregator.add(b, 3)
    sumAggregator.merge(a, b)
    expect(sumAggregator.finalize(a)).toBe(6)
  })

  it('avg keeps intermediate state across merge', () => {
    const a = avgAggregator.init()
    const b = avgAggregator.init()
    avgAggregator.add(a, 2)
    avgAggregator.add(a, 4)
    avgAggregator.add(b, 6)
    avgAggregator.merge(a, b)
    expect(avgAggregator.finalize(a)).toBe(4)
  })

  it('distinctCount serializes for worker', () => {
    const state = distinctCountAggregator.init()
    distinctCountAggregator.add(state, 'a')
    distinctCountAggregator.add(state, 'b')
    distinctCountAggregator.add(state, 'a')
    const serialized = serializeAggregatorState('distinctCount', state)
    const restored = deserializeAggregatorState('distinctCount', serialized)
    expect(distinctCountAggregator.finalize(restored as typeof state)).toBe(2)
  })

  it('registry resolves built-ins', () => {
    expect(getAggregator('count').id).toBe('count')
    expect(getAggregator('min').id).toBe('min')
    expect(getAggregator('max').id).toBe('max')
  })
})
