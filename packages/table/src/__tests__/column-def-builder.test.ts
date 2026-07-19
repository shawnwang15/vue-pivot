import { describe, expect, it } from 'vitest'
import { createPivotEngine } from '@vue-pivot/core'
import { buildNestedColumnDefs, projectHeaderGroups, buildRowData } from '../column-def-builder'

describe('tanstack column adapter', () => {
  const engine = createPivotEngine({
    dataCfg: {
      fields: {
        rows: ['province'],
        columns: ['type', 'sub'],
        values: ['number'],
        valueInCols: true,
      },
      data: [
        { province: 'A', type: 't1', sub: 's1', number: 1 },
        { province: 'A', type: 't1', sub: 's2', number: 2 },
        { province: 'B', type: 't2', sub: 's1', number: 3 },
      ],
    },
    options: { hierarchyType: 'grid', defaultExpandDepth: 3 },
  })

  it('builds nested column defs from leaf x values', () => {
    const defs = buildNestedColumnDefs(engine.getViewport())
    expect(defs.length).toBeGreaterThan(0)
  })

  it('projects header groups with colSpan', () => {
    const cols = engine.getViewport().getColumns()
    const levels = projectHeaderGroups(cols, 0, cols.length)
    expect(levels.length).toBeGreaterThan(0)
    expect(levels[0]!.every((c) => c.colSpan >= 1)).toBe(true)
  })

  it('row data shares viewport row ids', () => {
    const rows = buildRowData(engine)
    const visible = engine.getViewport().getRows()
    expect(rows.map((r) => r.rowNodeId)).toEqual(visible.map((r) => r.nodeId))
  })
})
