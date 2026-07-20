export type FieldName = string

/** raw = detail rows needing local pivot; aggregated = pre-crossed cells, skip library aggregation */
export type DataKind = 'raw' | 'aggregated'

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

export type PivotDimensionValue = string | number | boolean | null

export interface AggregateAxisCoverage {
  grandTotal?: boolean
  subTotals?: FieldName[]
  treeNodes?: boolean
}

export interface AggregateOptions {
  shape: 'wide'
  sparse?: boolean
  /** First version only supports error on duplicates */
  duplicateCells?: 'error'
  missingCell?: 'null'
  /** Declares which totals are actually provided; undeclared kinds must not appear */
  totals?: {
    row?: AggregateAxisCoverage
    column?: AggregateAxisCoverage
  }
}

/** Subtotal wide row: prefix dims present, subTotalOn and later dims on that axis omitted */
export interface AggregatedSubTotalRecord extends PivotRecord {
  subTotalOn: FieldName
  subTotalAxis: 'row' | 'column'
}

/** Optional pre-aggregated cells keyed by dimension path (raw mode only) */
export interface PreAggregatedCell {
  rowPath: unknown[]
  colPath: unknown[]
  values: Record<FieldName, unknown>
}

/** Raw detail rows; dataKind may be omitted (defaults to raw) */
export interface RawDataCfg {
  dataKind?: 'raw'
  fields: PivotFields
  meta?: FieldMeta[]
  data?: PivotRecord[]
  preAggregated?: PreAggregatedCell[]
}

/**
 * Authoritative crossed/aggregated wide table; skip library aggregation.
 * - `data`: complete leaf cells (all row + column fields present; null is a legal dim value)
 * - `totals`: grand-total cells (missing dims = rolled up on that axis)
 * - `subTotals`: subtotal cells with subTotalOn / subTotalAxis
 */
export interface AggregatedDataCfg {
  dataKind: 'aggregated'
  fields: PivotFields
  meta?: FieldMeta[]
  data: PivotRecord[]
  totals?: PivotRecord[]
  subTotals?: AggregatedSubTotalRecord[]
  totalLabel?: string
  subTotalLabel?: string
  aggregate: AggregateOptions
  /** Optional facet members for filter UI (not inferred from aggregated cells) */
  fieldValues?: Record<FieldName, unknown[]>
}

export type DataCfg = RawDataCfg | AggregatedDataCfg

const SUBTOTAL_META_KEYS = new Set(['subTotalOn', 'subTotalAxis'])

export function isAggregatedDataCfg(cfg: DataCfg): cfg is AggregatedDataCfg {
  return cfg.dataKind === 'aggregated'
}

export function isRawDataCfg(cfg: DataCfg): cfg is RawDataCfg {
  return cfg.dataKind !== 'aggregated'
}

export function getDataKind(cfg: DataCfg): DataKind {
  return cfg.dataKind === 'aggregated' ? 'aggregated' : 'raw'
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

function isReservedKey(key: string): boolean {
  return SUBTOTAL_META_KEYS.has(key) || key.startsWith('$vp') || key === '$pivot'
}

/** All known field names: data keys ∪ meta ∪ currently assigned zones. */
export function listFieldCatalog(dataCfg: DataCfg): string[] {
  const catalog = new Set<string>()
  for (const record of dataCfg.data ?? []) {
    for (const key of Object.keys(record)) {
      if (!isReservedKey(key)) catalog.add(key)
    }
  }
  for (const m of dataCfg.meta ?? []) {
    if (!isReservedKey(m.field)) catalog.add(m.field)
  }
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

/**
 * Distinct values for a field.
 * Aggregated mode prefers `fieldValues`; otherwise scans leaf `data` only.
 */
export function listFieldValues(dataCfg: DataCfg, field: string): unknown[] {
  if (isAggregatedDataCfg(dataCfg) && dataCfg.fieldValues?.[field]) {
    return [...dataCfg.fieldValues[field]!].sort(compareFieldValues)
  }

  const seen = new Set<unknown>()
  const values: unknown[] = []
  for (const record of dataCfg.data ?? []) {
    if (isReservedKey(field)) continue
    if (!(field in record)) continue
    const value = record[field]
    if (seen.has(value)) continue
    seen.add(value)
    values.push(value)
  }
  return values.sort(compareFieldValues)
}
