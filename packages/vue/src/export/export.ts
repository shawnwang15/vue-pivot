import type { PivotEngine } from '@vue-pivot/core'

export interface ExportOptions {
  formatted?: boolean
  includeTotals?: boolean
}

export function exportToCsv(engine: PivotEngine, options: ExportOptions = {}): string {
  const vp = engine.getViewport()
  const rows = vp.getRows()
  const cols = vp.getColumns()
  const lines: string[] = []
  const header = ['', ...cols.map((c) => c.label)]
  lines.push(header.map(csvEscape).join(','))
  for (const row of rows) {
    if (!options.includeTotals && (row.kind === 'grandTotal' || row.kind === 'subTotal')) continue
    const cells = cols.map((col) => {
      const cell = vp.getCell(row.index, col.index)
      return options.formatted === false ? String(cell.value ?? '') : cell.formatted
    })
    lines.push([row.label, ...cells].map(csvEscape).join(','))
  }
  return lines.join('\n')
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** Lightweight Excel XML spreadsheet (SpreadsheetML) without heavy deps */
export function exportToExcelXml(engine: PivotEngine, options: ExportOptions = {}): string {
  const vp = engine.getViewport()
  const rows = vp.getRows()
  const cols = vp.getColumns()
  const rowXml: string[] = []
  rowXml.push(
    `<Row>${['', ...cols.map((c) => c.label)].map((v) => `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`).join('')}</Row>`,
  )
  for (const row of rows) {
    if (!options.includeTotals && (row.kind === 'grandTotal' || row.kind === 'subTotal')) continue
    const cells = [`<Cell><Data ss:Type="String">${escapeXml(row.label)}</Data></Cell>`]
    for (const col of cols) {
      const cell = vp.getCell(row.index, col.index)
      const text = options.formatted === false ? String(cell.value ?? '') : cell.formatted
      const isNum = typeof cell.value === 'number' && options.formatted === false
      cells.push(
        `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(text)}</Data></Cell>`,
      )
    }
    rowXml.push(`<Row>${cells.join('')}</Row>`)
  }
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Pivot"><Table>
${rowXml.join('\n')}
</Table></Worksheet></Workbook>`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function copySelection(engine: PivotEngine): Promise<string> {
  const selection = engine.getState().selection
  const vp = engine.getViewport()
  if (!selection.length) {
    const text = exportToCsv(engine, { formatted: true, includeTotals: true })
    await navigator.clipboard?.writeText(text)
    return text
  }
  const lines: string[] = []
  for (const range of selection) {
    for (let r = range.start.rowIndex; r <= range.end.rowIndex; r++) {
      const row: string[] = []
      for (let c = range.start.colIndex; c <= range.end.colIndex; c++) {
        row.push(vp.getCell(r, c).formatted)
      }
      lines.push(row.join('\t'))
    }
  }
  const text = lines.join('\n')
  await navigator.clipboard?.writeText(text)
  return text
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
