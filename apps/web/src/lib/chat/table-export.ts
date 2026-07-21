/**
 * Export a rendered markdown table (as a hast element tree from react-markdown)
 * to CSV, so assistant answers can be opened in Excel.
 */

interface HastNode {
  type: string
  tagName?: string
  value?: string
  children?: HastNode[]
}

function textOf(node: HastNode): string {
  if (node.type === 'text') return node.value || ''
  return (node.children || []).map(textOf).join('')
}

function collectRows(node: HastNode, rows: string[][]) {
  if (node.tagName === 'tr') {
    const cells = (node.children || [])
      .filter(child => child.tagName === 'th' || child.tagName === 'td')
      .map(cell => textOf(cell).trim())
    if (cells.length) rows.push(cells)
    return
  }
  for (const child of node.children || []) collectRows(child, rows)
}

/** Extract the cell text of a hast <table> element as rows of strings. */
export function hastTableToRows(tableNode: unknown): string[][] {
  const rows: string[][] = []
  collectRows(tableNode as HastNode, rows)
  return rows
}

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map(row => row.map(csvField).join(',')).join('\r\n')
}

/** Trigger a browser download of the rows as a UTF-8 CSV (BOM for Excel). */
export function downloadRowsAsCsv(rows: string[][], filename: string) {
  const blob = new Blob(['\uFEFF' + rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Download the rows as an .xlsx workbook (same library as board export). */
export async function downloadRowsAsXlsx(rows: string[][], filename: string) {
  const XLSX = await import('xlsx-js-style')
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  worksheet['!cols'] = (rows[0] || []).map((_, col) => ({
    wch: Math.min(40, Math.max(10, ...rows.map(row => (row[col] || '').length + 2))),
  }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
  XLSX.writeFile(workbook, filename)
}
