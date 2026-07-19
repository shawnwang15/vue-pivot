import type { PivotRecord } from '../types/data-cfg'
import type { FilterSpec, SortSpec, TopNSpec } from '../types/options'

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

export function applyPreFilters(records: PivotRecord[], filters: FilterSpec[]): PivotRecord[] {
  const pre = filters.filter((f) => !f.postAggregation)
  if (!pre.length) return records
  return records.filter((record) => pre.every((f) => matchFilter(record[f.field], f)))
}

export function matchFilter(value: unknown, filter: FilterSpec): boolean {
  const { operator, value: expected } = filter
  switch (operator) {
    case 'eq':
      return value === expected
    case 'ne':
      return value !== expected
    case 'gt':
      return Number(value) > Number(expected)
    case 'gte':
      return Number(value) >= Number(expected)
    case 'lt':
      return Number(value) < Number(expected)
    case 'lte':
      return Number(value) <= Number(expected)
    case 'in':
      return Array.isArray(expected) && expected.includes(value)
    case 'notIn':
      return Array.isArray(expected) && !expected.includes(value)
    case 'between':
      return (
        Array.isArray(expected) &&
        expected.length === 2 &&
        Number(value) >= Number(expected[0]) &&
        Number(value) <= Number(expected[1])
      )
    case 'contains':
      return String(value ?? '').includes(String(expected ?? ''))
    default:
      return true
  }
}

export function sortRecords(records: PivotRecord[], sort: SortSpec[]): PivotRecord[] {
  if (!sort.length) return records
  const dimSorts = sort.filter((s) => s.method !== 'measure' && !s.measure)
  if (!dimSorts.length) return records
  return [...records].sort((a, b) => {
    for (const s of dimSorts) {
      const cmp = compareValues(a[s.field], b[s.field])
      if (cmp !== 0) return s.order === 'desc' ? -cmp : cmp
    }
    return 0
  })
}

export function applyTopN(
  records: PivotRecord[],
  topN: TopNSpec[],
): PivotRecord[] {
  if (!topN.length) return records
  let result = records
  for (const spec of topN) {
    const groups = new Map<string, PivotRecord[]>()
    for (const record of result) {
      const key = String(record[spec.field] ?? '(null)')
      const list = groups.get(key)
      if (list) list.push(record)
      else groups.set(key, [record])
    }
    const ranked = [...groups.entries()]
      .map(([key, rows]) => {
        const measureSum = rows.reduce((acc, r) => acc + (Number(r[spec.measure]) || 0), 0)
        return { key, rows, measureSum }
      })
      .sort((a, b) =>
        spec.order === 'asc' ? a.measureSum - b.measureSum : b.measureSum - a.measureSum,
      )

    const keep = ranked.slice(0, spec.n)
    if (spec.others && ranked.length > spec.n) {
      const othersRows = ranked.slice(spec.n).flatMap((g) =>
        g.rows.map((r) => ({ ...r, [spec.field]: 'Others' })),
      )
      result = [...keep.flatMap((g) => g.rows), ...othersRows]
    } else {
      result = keep.flatMap((g) => g.rows)
    }
  }
  return result
}

export function applyPostFilters(
  value: unknown,
  filters: FilterSpec[],
  measureField: string,
): boolean {
  const post = filters.filter((f) => f.postAggregation && f.field === measureField)
  return post.every((f) => matchFilter(value, f))
}
