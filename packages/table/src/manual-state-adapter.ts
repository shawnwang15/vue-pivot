import type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'
import type { PivotCommand, PivotEngine, SheetType, SortSpec } from '@vue-pivot/core'
import { getSheetType } from '@vue-pivot/core'

export interface ManualTableState {
  sorting: SortingState
  columnVisibility: VisibilityState
  columnOrder: ColumnOrderState
  columnSizing: ColumnSizingState
  columnPinning: ColumnPinningState
}

export function readManualState(engine: PivotEngine): ManualTableState {
  const state = engine.getState()
  const sorting: SortingState = state.sort.map((s) => ({
    id: s.field,
    desc: s.order === 'desc',
  }))
  const columnVisibility: VisibilityState = Object.fromEntries(state.columnUI.visibility)
  const columnSizing: ColumnSizingState = Object.fromEntries(state.columnUI.widths)
  const columnOrder = [...state.columnUI.order]
  const left: string[] = []
  const right: string[] = []
  for (const [id, pin] of state.columnUI.pinned) {
    if (pin === 'left') left.push(id)
    if (pin === 'right') right.push(id)
  }
  return {
    sorting,
    columnVisibility,
    columnOrder,
    columnSizing,
    columnPinning: { left, right },
  }
}

export function sortingToCommands(
  sorting: SortingState,
  sheetType: SheetType = 'pivot',
): PivotCommand {
  const sort: SortSpec[] = sorting.map((s) => {
    const field = s.id.includes('/') ? (s.id.split('/').pop() ?? s.id) : s.id
    if (sheetType === 'table') {
      return {
        field,
        order: s.desc ? 'desc' : 'asc',
        method: 'alpha' as const,
      }
    }
    return {
      field: s.id,
      order: s.desc ? 'desc' : 'asc',
      method: 'measure' as const,
      measure: field,
    }
  })
  return { type: 'sort', sort }
}

export function visibilityToCommands(
  visibility: VisibilityState,
): PivotCommand[] {
  return Object.entries(visibility).map(([columnId, visible]) => ({
    type: 'setColumnVisibility' as const,
    columnId,
    visible: visible !== false,
  }))
}

export function sizingToCommands(sizing: ColumnSizingState): PivotCommand[] {
  return Object.entries(sizing).map(([columnId, width]) => ({
    type: 'resizeColumn' as const,
    columnId,
    width,
  }))
}

export function orderToCommand(order: ColumnOrderState): PivotCommand {
  return { type: 'reorderColumns', columnIds: [...order] }
}

export function pinningToCommands(pinning: ColumnPinningState): PivotCommand[] {
  const cmds: PivotCommand[] = []
  for (const id of pinning.left ?? []) cmds.push({ type: 'pinColumn', columnId: id, pinned: 'left' })
  for (const id of pinning.right ?? []) cmds.push({ type: 'pinColumn', columnId: id, pinned: 'right' })
  return cmds
}

/** Apply TanStack controlled state changes into PivotCommands (single source of truth = core) */
export function applyManualStateChange(
  engine: PivotEngine,
  patch: Partial<ManualTableState>,
): void {
  if (patch.sorting) {
    engine.dispatch(sortingToCommands(patch.sorting, getSheetType(engine.getState().dataCfg)))
  }
  if (patch.columnVisibility) {
    for (const cmd of visibilityToCommands(patch.columnVisibility)) engine.dispatch(cmd)
  }
  if (patch.columnSizing) {
    for (const cmd of sizingToCommands(patch.columnSizing)) engine.dispatch(cmd)
  }
  if (patch.columnOrder) engine.dispatch(orderToCommand(patch.columnOrder))
  if (patch.columnPinning) {
    for (const cmd of pinningToCommands(patch.columnPinning)) engine.dispatch(cmd)
  }
}
