import type { ConditionsOptions, PivotCell } from '@vue-pivot/core'

export interface ConditionStyle {
  color?: string
  background?: string
  icon?: unknown
  interval?: { ratio: number }
}

export function mapConditions(
  cell: PivotCell,
  conditions?: ConditionsOptions,
): ConditionStyle {
  const style: ConditionStyle = {}
  if (!conditions) return style

  for (const rule of conditions.text ?? []) {
    if (rule.field && rule.field !== cell.measure) continue
    const mapped = rule.mapping(cell.value, cell)
    if (typeof mapped === 'string') style.color = mapped
  }
  for (const rule of conditions.background ?? []) {
    if (rule.field && rule.field !== cell.measure) continue
    const mapped = rule.mapping(cell.value, cell)
    if (typeof mapped === 'string') style.background = mapped
  }
  for (const rule of conditions.interval ?? []) {
    if (rule.field && rule.field !== cell.measure) continue
    const mapped = rule.mapping(cell.value, cell)
    if (typeof mapped === 'number') style.interval = { ratio: Math.max(0, Math.min(1, mapped)) }
  }
  for (const rule of conditions.icon ?? []) {
    if (rule.field && rule.field !== cell.measure) continue
    style.icon = rule.mapping(cell.value, cell)
  }
  return style
}
