import type { BoardItem, BoardColumn } from '../types/board'

// Default status options if column config doesn't specify
const DEFAULT_STATUS_OPTIONS = [
  { key: 'not_started', label: 'Not Started' },
  { key: 'working_on_it', label: 'Working on it' },
  { key: 'stuck', label: 'Stuck' },
  { key: 'done', label: 'Done' },
  { key: 'in_progress', label: 'In Progress' },
]

export interface ExportLookups {
  persons?: Map<string, string>        // UUID -> name
  companies?: Map<string, string>      // UUID -> name
  routes?: Map<string, string>         // UUID -> name
  serviceTypes?: Map<string, string>   // UUID -> name
}

interface ExportOptions {
  format: 'csv' | 'excel'
  items: BoardItem[]
  columns: BoardColumn[]
  boardName: string
  lookups?: ExportLookups
}

/**
 * Get status label from column config or default options
 */
function getStatusLabel(statusKey: string, column: BoardColumn): string {
  if (!statusKey) return ''

  let statusOptions = DEFAULT_STATUS_OPTIONS

  if (column.config?.options) {
    if (Array.isArray(column.config.options)) {
      statusOptions = column.config.options.map((opt: any) => ({
        key: opt.key || opt.label?.toLowerCase().replace(/\s+/g, '_'),
        label: opt.label,
      }))
    } else {
      statusOptions = Object.entries(column.config.options).map(([key, opt]: [string, any]) => ({
        key,
        label: opt.label,
      }))
    }
  }

  const option = statusOptions.find(opt => opt.key === statusKey)
  return option?.label || statusKey
}

/**
 * Format cell value for export based on column type
 */
function formatCellValue(
  value: any,
  column: BoardColumn,
  lookups?: ExportLookups
): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const columnType = column.column_type

  switch (columnType) {
    case 'status':
      return getStatusLabel(String(value), column)

    case 'person':
      // Resolve person UUID to name
      if (lookups?.persons?.has(value)) {
        return lookups.persons.get(value) || value
      }
      return value

    case 'company':
      // Resolve company UUID to name
      if (lookups?.companies?.has(value)) {
        return lookups.companies.get(value) || value
      }
      return value

    case 'route':
      // Resolve route UUID to name
      if (lookups?.routes?.has(value)) {
        return lookups.routes.get(value) || value
      }
      return value

    case 'service_type':
      // Resolve service type UUID to name
      if (lookups?.serviceTypes?.has(value)) {
        return lookups.serviceTypes.get(value) || value
      }
      return value

    case 'checkbox':
      return value === true ? 'Yes' : value === false ? 'No' : ''

    case 'date':
      if (value) {
        try {
          const date = new Date(value)
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        } catch {
          return String(value)
        }
      }
      return ''

    case 'date_range':
      if (value && typeof value === 'object') {
        const startDate = value.start || value.startDate
        const endDate = value.end || value.endDate
        const formatDateRange = (d: string) => {
          try {
            const date = new Date(d)
            return date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          } catch {
            return d
          }
        }
        if (startDate && endDate) {
          return `${formatDateRange(startDate)} to ${formatDateRange(endDate)}`
        }
        if (startDate) {
          return `${formatDateRange(startDate)} to -`
        }
        if (endDate) {
          return `- to ${formatDateRange(endDate)}`
        }
      }
      if (typeof value === 'string' && value.includes(' to ')) {
        return value // Already formatted
      }
      return ''

    case 'files':
      if (Array.isArray(value)) {
        return value.length > 0 ? `${value.length} file(s)` : ''
      }
      return ''

    case 'updates':
      // Updates column shows comment count
      if (typeof value === 'number') {
        return value > 0 ? `${value} update(s)` : ''
      }
      return ''

    case 'number':
      return typeof value === 'number' ? String(value) : value

    default:
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
      }
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      if (typeof value === 'object') {
        return JSON.stringify(value)
      }
      return String(value)
  }
}

/**
 * Export board data to CSV format
 */
export function exportToCSV({ items, columns, boardName, lookups }: ExportOptions): void {
  // Build headers
  const headers = ['Name', ...columns.map(col => col.column_name)]

  // Build rows
  const rows = items.map(item => {
    const rowData: string[] = [item.name || 'Unnamed']

    columns.forEach(col => {
      const value = item.data?.[col.column_id] ?? ''
      const displayValue = formatCellValue(value, col, lookups)
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
export function exportToExcel({ items, columns, boardName, lookups }: ExportOptions): void {
  // Build headers
  const headers = ['Name', ...columns.map(col => col.column_name)]

  // Build rows
  const rows = items.map(item => {
    const rowData: (string | number | boolean)[] = [item.name || 'Unnamed']

    columns.forEach(col => {
      const value = item.data?.[col.column_id]
      const displayValue = formatCellValue(value, col, lookups)

      // Keep numbers as numbers for Excel
      if (col.column_type === 'number' && typeof value === 'number') {
        rowData.push(value)
      } else {
        rowData.push(displayValue)
      }
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
