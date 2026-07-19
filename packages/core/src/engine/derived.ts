import type { DerivedMeasureSpec } from '../types/options'
import type { PivotCell } from '../types/layout'

/** Lightweight derived measure helpers applied on finalized cells */
export function applyDerivedMeasure(
  cells: PivotCell[],
  spec: DerivedMeasureSpec,
): PivotCell[] {
  if (spec.kind === 'ratio') {
    const baseTotal = cells
      .filter((c) => c.measure === spec.baseMeasure)
      .reduce((acc, c) => acc + (Number(c.value) || 0), 0)
    return cells.map((c) => {
      if (c.measure !== spec.baseMeasure) return c
      const ratio = baseTotal === 0 ? null : (Number(c.value) || 0) / baseTotal
      return {
        ...c,
        measure: spec.id,
        value: ratio,
        formatted: ratio == null ? '-' : `${(ratio * 100).toFixed(2)}%`,
        meta: { ...(c.meta ?? {}), derived: spec.kind },
      }
    })
  }

  if (spec.kind === 'rank') {
    const ranked = cells
      .filter((c) => c.measure === spec.baseMeasure)
      .map((c) => ({ ...c }))
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    const rankMap = new Map<string, number>()
    ranked.forEach((c, i) => {
      rankMap.set(`${c.rowNodeId}|${c.colNodeId}`, i + 1)
    })
    return cells.map((c) => {
      if (c.measure !== spec.baseMeasure) return c
      const rank = rankMap.get(`${c.rowNodeId}|${c.colNodeId}`) ?? null
      return {
        ...c,
        measure: spec.id,
        value: rank,
        formatted: rank == null ? '-' : String(rank),
        meta: { ...(c.meta ?? {}), derived: spec.kind },
      }
    })
  }

  // yoy / mom / custom — placeholder passthrough with metadata for server/adapters
  return cells.map((c) =>
    c.measure === spec.baseMeasure
      ? {
          ...c,
          measure: spec.id,
          meta: { ...(c.meta ?? {}), derived: spec.kind, periodField: spec.periodField },
        }
      : c,
  )
}
