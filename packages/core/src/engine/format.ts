import type { DataCfg, FieldMeta, FormatSpec, MetaFormatter } from '../types/data-cfg'
import type { NullPrecisionOptions } from '../types/options'

export function formatValue(
  value: unknown,
  formatter: MetaFormatter | undefined,
  nullPrecision?: NullPrecisionOptions,
): string {
  if (value == null || value === '') {
    return nullPrecision?.nullDisplay ?? '-'
  }
  if (!formatter) {
    if (typeof value === 'number' && nullPrecision?.precision != null) {
      return value.toFixed(nullPrecision.precision)
    }
    return String(value)
  }
  if (typeof formatter === 'function') {
    return formatter(value)
  }
  return formatBySpec(value, formatter)
}

export function formatBySpec(value: unknown, spec: FormatSpec): string {
  const n = Number(value)
  switch (spec.type) {
    case 'number': {
      const precision = spec.precision ?? 2
      const body = Number.isFinite(n) ? n.toFixed(precision) : String(value)
      return `${spec.prefix ?? ''}${body}${spec.suffix ?? ''}`
    }
    case 'percent': {
      const precision = spec.precision ?? 2
      return Number.isFinite(n) ? `${(n * 100).toFixed(precision)}%` : String(value)
    }
    case 'currency': {
      const precision = spec.precision ?? 2
      const currency = spec.currency ?? 'USD'
      if (!Number.isFinite(n)) return String(value)
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(n)
      } catch {
        return `${currency} ${n.toFixed(precision)}`
      }
    }
    case 'custom':
      return String(value)
  }
}

export function getFieldMeta(dataCfg: DataCfg, field: string): FieldMeta | undefined {
  return dataCfg.meta?.find((m) => m.field === field)
}
