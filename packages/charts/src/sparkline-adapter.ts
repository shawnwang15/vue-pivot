import type { PivotCell } from '@vue-pivot/core'

export interface SparklineOption {
  type?: 'line' | 'bar'
  data: number[]
  color?: string
}

export function cellToSparklineOption(cell: PivotCell): SparklineOption | null {
  const series = cell.meta?.sparkline
  if (!Array.isArray(series)) return null
  return {
    type: 'line',
    data: series.map((v) => Number(v) || 0),
    color: '#0f6e56',
  }
}

export async function renderSparkline(
  el: HTMLElement,
  option: SparklineOption,
): Promise<() => void> {
  try {
    const echarts = await import('echarts')
    const chart = echarts.init(el, undefined, { renderer: 'canvas' })
    chart.setOption({
      animation: false,
      grid: { left: 0, right: 0, top: 2, bottom: 2 },
      xAxis: { type: 'category', show: false, data: option.data.map((_, i) => i) },
      yAxis: { type: 'value', show: false },
      series: [
        {
          type: option.type ?? 'line',
          data: option.data,
          showSymbol: false,
          lineStyle: { width: 1.5, color: option.color },
          itemStyle: { color: option.color },
        },
      ],
    })
    return () => chart.dispose()
  } catch {
    el.textContent = option.data.join(',')
    return () => {
      el.textContent = ''
    }
  }
}
