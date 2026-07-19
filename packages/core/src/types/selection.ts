export interface CellCoord {
  rowIndex: number
  colIndex: number
  rowNodeId?: number
  colNodeId?: number
}

export interface SelectionRange {
  start: CellCoord
  end: CellCoord
  kind?: 'cell' | 'row' | 'column' | 'brush'
}

export function normalizeRange(range: SelectionRange): SelectionRange {
  const rowStart = Math.min(range.start.rowIndex, range.end.rowIndex)
  const rowEnd = Math.max(range.start.rowIndex, range.end.rowIndex)
  const colStart = Math.min(range.start.colIndex, range.end.colIndex)
  const colEnd = Math.max(range.start.colIndex, range.end.colIndex)
  return {
    ...range,
    start: { ...range.start, rowIndex: rowStart, colIndex: colStart },
    end: { ...range.end, rowIndex: rowEnd, colIndex: colEnd },
  }
}

export function rangesOverlap(a: SelectionRange, b: SelectionRange): boolean {
  const na = normalizeRange(a)
  const nb = normalizeRange(b)
  return !(
    na.end.rowIndex < nb.start.rowIndex ||
    na.start.rowIndex > nb.end.rowIndex ||
    na.end.colIndex < nb.start.colIndex ||
    na.start.colIndex > nb.end.colIndex
  )
}
