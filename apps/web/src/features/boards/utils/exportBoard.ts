import type { BoardItem, BoardColumn } from '../types/board'

interface ExportOptions {
  format: 'csv' | 'excel'
  items: BoardItem[]
  columns: BoardColumn[]
  boardName: string
}

/**
 * Export board data to CSV format
 */
export function exportToCSV({ items, columns, boardName }: ExportOptions): void {
  // Build headers
  const headers = ['Name', ...columns.map(col => col.column_name)]

  // Build rows
  const rows = items.map(item => {
    const rowData: string[] = [item.name || 'Unnamed']

    columns.forEach(col => {
      const value = item.data?.[col.column_id] ?? ''
      // Handle different column types
      let displayValue = ''

      if (value === null || value === undefined) {
        displayValue = ''
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Yes' : 'No'
      } else if (Array.isArray(value)) {
        // For files column, show count
        displayValue = `${value.length} file(s)`
      } else if (typeof value === 'object') {
        displayValue = JSON.stringify(value)
      } else {
        displayValue = String(value)
      }

      rowData.push(displayValue)
    })

    return rowData
  })

  // Convert to CSV string
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  // Download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${sanitizeFilename(boardName)}_${formatDate()}.csv`)
}

/**
 * Export board data to Excel format (XLSX)
 * Uses a simple XML-based format that Excel can open
 */
export function exportToExcel({ items, columns, boardName }: ExportOptions): void {
  // Build headers
  const headers = ['Name', ...columns.map(col => col.column_name)]

  // Build rows
  const rows = items.map(item => {
    const rowData: (string | number | boolean)[] = [item.name || 'Unnamed']

    columns.forEach(col => {
      const value = item.data?.[col.column_id]
      let displayValue: string | number | boolean = ''

      if (value === null || value === undefined) {
        displayValue = ''
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Yes' : 'No'
      } else if (typeof value === 'number') {
        displayValue = value
      } else if (Array.isArray(value)) {
        displayValue = `${value.length} file(s)`
      } else if (typeof value === 'object') {
        displayValue = JSON.stringify(value)
      } else {
        displayValue = String(value)
      }

      rowData.push(displayValue)
    })

    return rowData
  })

  // Create XML spreadsheet
  const xmlContent = generateExcelXML(headers, rows, boardName)

  // Download
  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  downloadBlob(blob, `${sanitizeFilename(boardName)}_${formatDate()}.xls`)
}

/**
 * Generate Excel XML format
 */
function generateExcelXML(headers: string[], rows: (string | number | boolean)[][], sheetName: string): string {
  const escapeXml = (str: string) => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const headerCells = headers.map(h => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')
  const headerRow = `<Row>${headerCells}</Row>`

  const dataRows = rows.map(row => {
    const cells = row.map(cell => {
      const type = typeof cell === 'number' ? 'Number' : 'String'
      return `<Cell><Data ss:Type="${type}">${escapeXml(String(cell))}</Data></Cell>`
    }).join('')
    return `<Row>${cells}</Row>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="11"/>
    </Style>
    <Style ss:ID="Header">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="11" ss:Bold="1"/>
      <Interior ss:Color="#E6E9EF" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(sheetName.substring(0, 31))}">
    <Table>
      ${headerRow}
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
}

/**
 * Format current date for filename
 */
function formatDate(): string {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
}
