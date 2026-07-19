import type { DataCfg, FieldMeta, MeasureInput } from '../types/data-cfg'
import type { PivotOptions } from '../types/options'

/** Minimal S2-like dataCfg shape for migration */
export interface S2LikeDataCfg {
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

export function fromS2DataCfg(s2: S2LikeDataCfg): DataCfg {
  return {
    fields: {
      rows: [...(s2.fields?.rows ?? [])],
      columns: [...(s2.fields?.columns ?? [])],
      values: [...(s2.fields?.values ?? [])],
      valueInCols: s2.fields?.valueInCols !== false,
    },
    meta: (s2.meta ?? []).map((m) => ({
      field: m.field,
      name: m.name,
      formatter: m.formatter,
    })),
    data: (s2.data ?? []) as DataCfg['data'],
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
