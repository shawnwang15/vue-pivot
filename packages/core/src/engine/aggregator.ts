import Big from 'big.js'

// Decimal places for division (avg) and rounding mode. Adjustable via configureAggregatorPrecision.
Big.DP = 20
Big.RM = Big.roundHalfUp

export function configureAggregatorPrecision(opts: { dp?: number; rm?: number }): void {
  if (opts.dp != null) Big.DP = opts.dp
  if (opts.rm != null) Big.RM = opts.rm
}

export interface Aggregator<TInput = unknown, TState = unknown, TResult = unknown> {
  id: string
  init(): TState
  add(state: TState, value: TInput, record?: unknown): void
  merge(state: TState, partial: TState): void
  finalize(state: TState): TResult
}

// Sum accumulates in Big for exact addition; count stays a plain integer.
export type SumState = { sum: Big; count: number }
export type AvgState = { sum: Big; count: number }
export type CountState = { count: number }
export type MinMaxState = { value: number | null }
export type DistinctState = { values: Set<unknown> | unknown[] }

function toNumber(value: unknown, treatNullAsZero = false): number | null {
  if (value == null || value === '') return treatNullAsZero ? 0 : null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export const sumAggregator: Aggregator<unknown, SumState, number> = {
  id: 'sum',
  init: () => ({ sum: new Big(0), count: 0 }),
  add(state, value) {
    const n = toNumber(value, true)
    if (n == null) return
    state.sum = state.sum.plus(n)
    state.count += 1
  },
  merge(state, partial) {
    state.sum = state.sum.plus(partial.sum)
    state.count += partial.count
  },
  finalize: (state) => state.sum.toNumber(),
}

export const avgAggregator: Aggregator<unknown, AvgState, number | null> = {
  id: 'avg',
  init: () => ({ sum: new Big(0), count: 0 }),
  add(state, value) {
    const n = toNumber(value)
    if (n == null) return
    state.sum = state.sum.plus(n)
    state.count += 1
  },
  merge(state, partial) {
    state.sum = state.sum.plus(partial.sum)
    state.count += partial.count
  },
  finalize: (state) => (state.count === 0 ? null : state.sum.div(state.count).toNumber()),
}

export const countAggregator: Aggregator<unknown, CountState, number> = {
  id: 'count',
  init: () => ({ count: 0 }),
  add(state) {
    state.count += 1
  },
  merge(state, partial) {
    state.count += partial.count
  },
  finalize: (state) => state.count,
}

export const minAggregator: Aggregator<unknown, MinMaxState, number | null> = {
  id: 'min',
  init: () => ({ value: null }),
  add(state, value) {
    const n = toNumber(value)
    if (n == null) return
    state.value = state.value == null ? n : Math.min(state.value, n)
  },
  merge(state, partial) {
    if (partial.value == null) return
    state.value = state.value == null ? partial.value : Math.min(state.value, partial.value)
  },
  finalize: (state) => state.value,
}

export const maxAggregator: Aggregator<unknown, MinMaxState, number | null> = {
  id: 'max',
  init: () => ({ value: null }),
  add(state, value) {
    const n = toNumber(value)
    if (n == null) return
    state.value = state.value == null ? n : Math.max(state.value, n)
  },
  merge(state, partial) {
    if (partial.value == null) return
    state.value = state.value == null ? partial.value : Math.max(state.value, partial.value)
  },
  finalize: (state) => state.value,
}

export const distinctCountAggregator: Aggregator<unknown, DistinctState, number> = {
  id: 'distinctCount',
  init: () => ({ values: new Set() }),
  add(state, value) {
    if (value == null) return
    if (state.values instanceof Set) state.values.add(value)
    else state.values.push(value)
  },
  merge(state, partial) {
    const target = state.values instanceof Set ? state.values : new Set(state.values)
    const source = partial.values instanceof Set ? partial.values : new Set(partial.values)
    for (const v of source) target.add(v)
    state.values = target
  },
  finalize: (state) => (state.values instanceof Set ? state.values.size : new Set(state.values).size),
}

const registry = new Map<string, Aggregator>([
  ['sum', sumAggregator],
  ['avg', avgAggregator],
  ['count', countAggregator],
  ['min', minAggregator],
  ['max', maxAggregator],
  ['distinctCount', distinctCountAggregator],
])

export function registerAggregator(aggregator: Aggregator): void {
  registry.set(aggregator.id, aggregator)
}

export function getAggregator(id: string): Aggregator {
  const agg = registry.get(id)
  if (!agg) throw new Error(`[vue-pivot] Unknown aggregator: ${id}`)
  return agg
}

export function listAggregators(): string[] {
  return [...registry.keys()]
}

/** Serialize aggregator state for Worker structured clone */
export function serializeAggregatorState(id: string, state: unknown): unknown {
  if (id === 'distinctCount') {
    const s = state as DistinctState
    return { values: s.values instanceof Set ? [...s.values] : s.values }
  }
  // Big instances are not structured-cloneable; serialize sum to string.
  if (id === 'sum' || id === 'avg') {
    const s = state as SumState
    return { sum: s.sum.toString(), count: s.count }
  }
  return state
}

export function deserializeAggregatorState(id: string, state: unknown): unknown {
  if (id === 'distinctCount') {
    const s = state as DistinctState
    return { values: new Set(s.values instanceof Set ? s.values : s.values) }
  }
  if (id === 'sum' || id === 'avg') {
    const s = state as { sum: string | Big; count: number }
    return { sum: s.sum instanceof Big ? s.sum : new Big(s.sum), count: s.count }
  }
  return state
}
