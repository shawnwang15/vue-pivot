import type { DataCfg, FieldMeta, MeasureInput, SheetType } from '../types/data-cfg'
import type { PivotOptions } from '../types/options'

/** Minimal S2-like dataCfg shape for migration */
export interface S2LikeDataCfg {
  /** Explicit sheet mode; TableSheet-like configs may omit and be inferred */
  sheetType?: SheetType
  fields?: {
    rows?: string[]
    columns?: string[]
    values?: MeasureInput[]
    valueInCols?: boolean
  }
  meta?: Array<{ field: string; name?: string; formatter?: FieldMeta['formatter'] }>
  data?: Record<string, unknown>[]
}

export interface S2LikeOptions {
  hierarchyType?: PivotOptions['hierarchyType']
  totals?: PivotOptions['totals']
  interaction?: PivotOptions['interaction']
  conditions?: PivotOptions['conditions']
  style?: PivotOptions['style']
}

function inferSheetType(s2: S2LikeDataCfg): SheetType {
  if (s2.sheetType === 'table' || s2.sheetType === 'pivot') return s2.sheetType
  const rows = s2.fields?.rows ?? []
  const values = s2.fields?.values ?? []
  const columns = s2.fields?.columns ?? []
  // S2 TableSheet typically uses columns-only with empty rows/values
  if (rows.length === 0 && values.length === 0 && columns.length > 0) return 'table'
  return 'pivot'
}

export function fromS2DataCfg(s2: S2LikeDataCfg): DataCfg {
  const sheetType = inferSheetType(s2)
  return {
    dataKind: 'raw',
    sheetType,
    fields: {
      rows: sheetType === 'table' ? [] : [...(s2.fields?.rows ?? [])],
      columns: [...(s2.fields?.columns ?? [])],
      values: sheetType === 'table' ? [] : [...(s2.fields?.values ?? [])],
      valueInCols: s2.fields?.valueInCols !== false,
    },
    meta: (s2.meta ?? []).map((m) => ({
      field: m.field,
      name: m.name,
      formatter: m.formatter,
    })),
    data: s2.data ?? [],
  }
}

export function fromS2Options(s2: S2LikeOptions = {}): PivotOptions {
  return {
    hierarchyType: s2.hierarchyType ?? 'grid',
    totals: s2.totals,
    interaction: s2.interaction,
    conditions: s2.conditions,
    style: s2.style,
  }
}
