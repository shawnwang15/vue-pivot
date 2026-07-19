import type { ColumnDef } from '@tanstack/vue-table'
import type { ColumnLayout, PivotCell, PivotEngine, PivotViewport } from '@vue-pivot/core'

export interface PivotRowData {
  rowIndex: number
  rowNodeId: number
  label: string
  depth: number
  kind: string
  cells: Record<string, PivotCell>
}

export function buildNestedColumnDefs(viewport: PivotViewport): ColumnDef<PivotRowData, unknown>[] {
  const columns = viewport.getColumns()
  if (!columns.length) return []

  // Build tree by shared path prefixes excluding measure leaf label when valueInCols
  type Node = {
    id: string
    label: string
    path: string[]
    children: Map<string, Node>
    leaf?: ColumnLayout
  }
  const root: Node = { id: 'root', label: '', path: [], children: new Map() }

  for (const col of columns) {
    let cur = root
    for (let i = 0; i < col.path.length; i++) {
      const part = col.path[i]!
      const id = col.path.slice(0, i + 1).join('/')
      if (!cur.children.has(part)) {
        cur.children.set(part, { id, label: part, path: col.path.slice(0, i + 1), children: new Map() })
      }
      cur = cur.children.get(part)!
      if (i === col.path.length - 1) cur.leaf = col
    }
  }

  const toDefs = (node: Node): ColumnDef<PivotRowData, unknown>[] => {
    if (node.leaf && node.children.size === 0) {
      const leaf = node.leaf
      return [
        {
          id: leaf.columnId,
          accessorFn: (row) => row.cells[leaf.columnId]?.value,
          header: leaf.label,
          size: leaf.width,
          enableSorting: true,
          enableHiding: true,
          enablePinning: true,
          meta: {
            nodeId: leaf.nodeId,
            measure: leaf.measure,
            kind: leaf.kind,
            path: leaf.path,
            pinned: leaf.pinned,
          },
        },
      ]
    }
    const children = [...node.children.values()].flatMap(toDefs)
    if (node.id === 'root') return children
    return [
      {
        id: node.id,
        header: node.label,
        columns: children,
      },
    ]
  }

  return toDefs(root)
}

export function buildRowData(engine: PivotEngine): PivotRowData[] {
  const viewport = engine.getViewport()
  const rows = viewport.getRows()
  const columns = viewport.getColumns()
  return rows.map((row) => {
    const cells: Record<string, PivotCell> = {}
    for (const col of columns) {
      cells[col.columnId] = viewport.getCell(row.index, col.index)
    }
    return {
      rowIndex: row.index,
      rowNodeId: row.nodeId,
      label: row.label,
      depth: row.depth,
      kind: row.kind,
      cells,
    }
  })
}

/**
 * Project horizontal virtual window onto header levels and recompute colSpan.
 * Returns header rows: Array<{ id, label, colSpan, startIndex, depth }>
 */
export function projectHeaderGroups(
  columns: ColumnLayout[],
  colStart: number,
  colEnd: number,
): Array<Array<{ id: string; label: string; colSpan: number; startIndex: number; depth: number }>> {
  const slice = columns.slice(colStart, colEnd)
  if (!slice.length) return []
  const maxDepth = Math.max(...slice.map((c) => c.path.length))
  const levels: Array<Array<{ id: string; label: string; colSpan: number; startIndex: number; depth: number }>> = []

  for (let depth = 0; depth < maxDepth; depth++) {
    const row: Array<{ id: string; label: string; colSpan: number; startIndex: number; depth: number }> = []
    let i = 0
    while (i < slice.length) {
      const col = slice[i]!
      if (col.path.length <= depth) {
        i++
        continue
      }
      const key = col.path.slice(0, depth + 1).join('/')
      let span = 1
      while (
        i + span < slice.length &&
        slice[i + span]!.path.slice(0, depth + 1).join('/') === key
      ) {
        span++
      }
      row.push({
        id: key,
        label: col.path[depth]!,
        colSpan: span,
        startIndex: colStart + i,
        depth,
      })
      i += span
    }
    levels.push(row)
  }
  return levels
}
