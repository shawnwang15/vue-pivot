export type FieldName = string

export type FormatSpec =
  | { type: 'number'; precision?: number; prefix?: string; suffix?: string }
  | { type: 'percent'; precision?: number }
  | { type: 'currency'; currency?: string; precision?: number }
  | { type: 'custom'; id: string }

export type MetaFormatter = ((value: unknown, record?: unknown) => string) | FormatSpec

export interface FieldMeta {
  field: FieldName
  name?: string
  formatter?: MetaFormatter
  description?: string
}

export type AggregatorId =
  | 'sum'
  | 'avg'
  | 'count'
  | 'min'
  | 'max'
  | 'distinctCount'
  | (string & {})

export interface MeasureField {
  field: FieldName
  aggregation?: AggregatorId
  name?: string
  /** Derived / calculated measure expression id */
  calcId?: string
}

export type MeasureInput = FieldName | MeasureField

export interface PivotFields {
  rows: FieldName[]
  columns: FieldName[]
  values: MeasureInput[]
  valueInCols?: boolean
  filters?: FieldName[]
}

export type PivotRecord = Record<string, unknown>

export interface DataCfg {
  fields: PivotFields
  meta?: FieldMeta[]
  data?: PivotRecord[]
  /** Optional pre-aggregated cells keyed by dimension path */
  preAggregated?: PreAggregatedCell[]
}

export interface PreAggregatedCell {
  rowPath: unknown[]
  colPath: unknown[]
  values: Record<FieldName, unknown>
}

export function normalizeMeasures(values: MeasureInput[]): MeasureField[] {
  return values.map((v) =>
    typeof v === 'string' ? { field: v, aggregation: 'sum' } : { aggregation: 'sum', ...v },
  )
}

function assignedFields(fields: PivotFields): Set<FieldName> {
  const assigned = new Set<FieldName>()
  for (const f of fields.rows ?? []) assigned.add(f)
  for (const f of fields.columns ?? []) assigned.add(f)
  for (const f of fields.filters ?? []) assigned.add(f)
  for (const v of fields.values ?? []) assigned.add(typeof v === 'string' ? v : v.field)
  return assigned
}

/** All known field names: data keys ∪ meta ∪ currently assigned zones. */
export function listFieldCatalog(dataCfg: DataCfg): string[] {
  const catalog = new Set<string>()
  for (const record of dataCfg.data ?? []) {
    for (const key of Object.keys(record)) catalog.add(key)
  }
  for (const m of dataCfg.meta ?? []) catalog.add(m.field)
  for (const f of assignedFields(dataCfg.fields)) catalog.add(f)
  return [...catalog].sort()
}

/** Fields in the catalog that are not in rows/columns/values/filters. */
export function listUnassignedFields(dataCfg: DataCfg): string[] {
  const assigned = assignedFields(dataCfg.fields)
  return listFieldCatalog(dataCfg).filter((f) => !assigned.has(f))
}

function compareFieldValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

/** Distinct values for a field from raw `dataCfg.data` (stable sort). */
export function listFieldValues(dataCfg: DataCfg, field: string): unknown[] {
  const seen = new Set<unknown>()
  const values: unknown[] = []
  for (const record of dataCfg.data ?? []) {
    if (!(field in record)) continue
    const value = record[field]
    if (seen.has(value)) continue
    seen.add(value)
    values.push(value)
  }
  return values.sort(compareFieldValues)
}
