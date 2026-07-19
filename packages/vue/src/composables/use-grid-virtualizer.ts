import { useVirtualizer, type Virtualizer } from '@tanstack/vue-virtual'
import { computed, ref, type Ref } from 'vue'

export interface GridVirtualizerOptions {
  scrollElement: Ref<HTMLElement | null>
  rowCount: Ref<number>
  columnCount: Ref<number>
  rowHeight?: number
  getColumnWidth: (index: number) => number
  frozenRowCount?: Ref<number>
  frozenColCount?: Ref<number>
  overscan?: number
}

export interface GridVirtualizerResult {
  rowVirtualizer: Ref<Virtualizer<HTMLElement, Element>>
  colVirtualizer: Ref<Virtualizer<HTMLElement, Element>>
  scrollTop: Ref<number>
  scrollLeft: Ref<number>
  onScroll: (e: Event) => void
  visibleRowRange: Ref<{ start: number; end: number }>
  visibleColRange: Ref<{ start: number; end: number }>
  totalWidth: Ref<number>
  totalHeight: Ref<number>
  adaptiveOverscan: Ref<number>
}

export function useGridVirtualizer(opts: GridVirtualizerOptions): GridVirtualizerResult {
  const scrollTop = ref(0)
  const scrollLeft = ref(0)
  const adaptiveOverscan = ref(opts.overscan ?? 4)
  let lastScrollTs = 0
  let lastScrollTop = 0

  const rowVirtualizer = useVirtualizer(
    computed(() => ({
      count: opts.rowCount.value,
      getScrollElement: () => opts.scrollElement.value,
      estimateSize: () => opts.rowHeight ?? 32,
      overscan: adaptiveOverscan.value,
      initialOffset: 0,
    })),
  )

  const colVirtualizer = useVirtualizer(
    computed(() => ({
      horizontal: true,
      count: opts.columnCount.value,
      getScrollElement: () => opts.scrollElement.value,
      estimateSize: (i) => opts.getColumnWidth(i),
      overscan: adaptiveOverscan.value,
    })),
  )

  const onScroll = (e: Event) => {
    const el = e.target as HTMLElement
    const now = performance.now()
    const dy = Math.abs(el.scrollTop - lastScrollTop)
    const dt = Math.max(1, now - lastScrollTs)
    const speed = dy / dt
    adaptiveOverscan.value = speed > 2 ? 12 : speed > 0.8 ? 8 : opts.overscan ?? 4
    lastScrollTs = now
    lastScrollTop = el.scrollTop
    scrollTop.value = el.scrollTop
    scrollLeft.value = el.scrollLeft
  }

  const visibleRowRange = computed(() => {
    const items = rowVirtualizer.value.getVirtualItems()
    if (!items.length) return { start: 0, end: 0 }
    return { start: items[0]!.index, end: items[items.length - 1]!.index + 1 }
  })

  const visibleColRange = computed(() => {
    const items = colVirtualizer.value.getVirtualItems()
    if (!items.length) return { start: 0, end: 0 }
    return { start: items[0]!.index, end: items[items.length - 1]!.index + 1 }
  })

  const totalWidth = computed(() => colVirtualizer.value.getTotalSize())
  const totalHeight = computed(() => rowVirtualizer.value.getTotalSize())

  return {
    rowVirtualizer,
    colVirtualizer,
    scrollTop,
    scrollLeft,
    onScroll,
    visibleRowRange,
    visibleColRange,
    totalWidth,
    totalHeight,
    adaptiveOverscan,
  }
}
