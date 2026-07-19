import type { PivotEngine } from '@vue-pivot/core'

export interface PivotChartOption {
  categories: string[]
  series: Array<{ name: string; data: number[] }>
}

export function buildPivotChartOption(engine: PivotEngine): PivotChartOption {
  const vp = engine.getViewport()
  const rows = vp.getRows().filter((r) => r.kind === 'dimension')
  const cols = vp.getColumns().filter((c) => c.kind === 'measure' || c.kind === 'dimension')
  const categories = rows.map((r) => r.label)
  const series = cols.slice(0, 8).map((col) => ({
    name: col.label,
    data: rows.map((row) => Number(vp.getCell(row.index, col.index).value) || 0),
  }))
  return { categories, series }
}

export async function renderPivotChart(
  el: HTMLElement,
  engine: PivotEngine,
): Promise<() => void> {
  const option = buildPivotChartOption(engine)
  try {
    const echarts = await import('echarts')
    const chart = echarts.init(el)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: option.series.map((s) => s.name) },
      xAxis: { type: 'category', data: option.categories },
      yAxis: { type: 'value' },
      series: option.series.map((s) => ({ ...s, type: 'bar' })),
    })
    return () => chart.dispose()
  } catch {
    el.textContent = 'ECharts is required as a peer dependency for pivot charts.'
    return () => {
      el.textContent = ''
    }
  }
}
