import { ref, type Ref } from 'vue'
import type { PivotCommand } from '@vue-pivot/core'

export interface KeyboardNavOptions {
  rowCount: Ref<number>
  colCount: Ref<number>
  dispatch: (cmd: PivotCommand) => void
  scrollToCell: (row: number, col: number) => void
  nonVirtual?: Ref<boolean>
}

export function useKeyboardNav(opts: KeyboardNavOptions) {
  const focusRow = ref(0)
  const focusCol = ref(0)

  const move = (dr: number, dc: number) => {
    focusRow.value = Math.max(0, Math.min(opts.rowCount.value - 1, focusRow.value + dr))
    focusCol.value = Math.max(0, Math.min(opts.colCount.value - 1, focusCol.value + dc))
    opts.scrollToCell(focusRow.value, focusCol.value)
    opts.dispatch({
      type: 'setSelection',
      selection: [
        {
          start: { rowIndex: focusRow.value, colIndex: focusCol.value },
          end: { rowIndex: focusRow.value, colIndex: focusCol.value },
          kind: 'cell',
        },
      ],
    })
  }

  const onKeydown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        move(-1, 0)
        break
      case 'ArrowDown':
        e.preventDefault()
        move(1, 0)
        break
      case 'ArrowLeft':
        e.preventDefault()
        move(0, -1)
        break
      case 'ArrowRight':
        e.preventDefault()
        move(0, 1)
        break
      case 'Home':
        e.preventDefault()
        focusCol.value = 0
        move(0, 0)
        break
      case 'End':
        e.preventDefault()
        focusCol.value = Math.max(0, opts.colCount.value - 1)
        move(0, 0)
        break
      case 'PageDown':
        e.preventDefault()
        move(10, 0)
        break
      case 'PageUp':
        e.preventDefault()
        move(-10, 0)
        break
    }
  }

  return { focusRow, focusCol, onKeydown, move }
}
