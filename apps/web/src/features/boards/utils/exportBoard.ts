import type { BoardItem, BoardColumn, BoardGroup } from '../types/board'
import { flattenGroupsForVirtualization } from './flattenGroupsForVirtualization'
import { getColorInfo, resolveStatusOptions } from '../constants/statusColors'

export interface ExportLookups {
  persons?: Map<string, string> // UUID -> name
  companies?: Map<string, string> // UUID -> name
  routes?: Map<string, string> // UUID -> name
  serviceTypes?: Map<string, string> // UUID -> name
}

interface ExportOptions {
  format: 'csv' | 'excel'
  items: BoardItem[]
  columns: BoardColumn[]
  boardName: string
  lookups?: ExportLookups
  /** Board's current groups (native or dynamic "group by column"). Group-header rows are only emitted when there's more than one. */
  groups?: BoardGroup[]
  /** Whether a column sort is active — mirrors VirtualizedBoardTable's item ordering within each group */
  preserveItemOrder?: boolean
}

interface ExportRow {
  cells: (string | number | boolean)[]
  /** Present when this row is a group-header section marker rather than an item row */
  groupHeader?: BoardGroup
  /** Present for item rows — the source item, kept around so XLSX styling (e.g. status colors) can re-resolve raw values */
  item?: BoardItem
}

/**
 * Get status label from column config or default options. Mirrors StatusCell's
 * on-screen resolution: an unset value falls back to the first configured
 * option rather than rendering blank (the board never shows a truly empty
 * status pill).
 */
function getStatusLabel(statusKey: string, column: BoardColumn): string {
  const statusOptions = resolveStatusOptions(column)
  const resolvedKey = statusKey || statusOptions[0]?.key
  const option = statusOptions.find(opt => opt.key === resolvedKey) || statusOptions[0]
  return option?.label || statusKey
}

/**
 * Get the background/text color for a status cell's current (or defaulted)
 * value, matching StatusCell's on-screen colored pill.
 */
function getStatusColorForValue(
  statusKey: string,
  column: BoardColumn
): { hex: string; text: string } {
  const statusOptions = resolveStatusOptions(column)
  const resolvedKey = statusKey || statusOptions[0]?.key
  const option = statusOptions.find(opt => opt.key === resolvedKey) || statusOptions[0]
  return option ? getColorInfo(option.color) : getColorInfo('explosive')
}

/**
 * Format cell value for export based on column type
 */
function formatCellValue(value: any, column: BoardColumn, lookups?: ExportLookups): string {
  const columnType = column.column_type

  // Status defaults an unset value to the first configured option (matching
  // the on-screen pill), so it must resolve before the generic blank check below.
  if (columnType === 'status') {
    return getStatusLabel(value ? String(value) : '', column)
  }

  if (value === null || value === undefined || value === '') {
    return ''
  }

  switch (columnType) {
    case 'person':
      // Resolve person UUID to name
      if (lookups?.persons?.has(value)) {
        return lookups.persons.get(value) || ''
      }
      return ''

    case 'company':
      // Resolve company UUID to name
      if (lookups?.companies?.has(value)) {
        return lookups.companies.get(value) || ''
      }
      return ''

    case 'route':
      // Resolve route UUID to name
      if (lookups?.routes?.has(value)) {
        return lookups.routes.get(value) || ''
      }
      return ''

    case 'service_type':
      // Resolve service type UUID to name
      if (lookups?.serviceTypes?.has(value)) {
        return lookups.serviceTypes.get(value) || ''
      }
      return ''

    case 'checkbox':
      return value === true ? 'Yes' : value === false ? 'No' : ''

    case 'date':
      if (value) {
        try {
          const date = new Date(value)
          return date.toLocaleDateString('ka-GE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
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
            return date.toLocaleDateString('ka-GE', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
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
        return value
          .map((f: any) => f?.name)
          .filter(Boolean)
          .join(', ')
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
 * Every board's columns always include a real `column_id: 'name'` entry
 * (pinned, position 1) whose value actually lives on `item.name`, not
 * `item.data.name` — the rest of the app special-cases it everywhere
 * (VirtualizedBoardTable, useFilteredItems, etc). Split it out so the export
 * uses its real configured label for the Name header and doesn't also emit
 * it a second time as an always-blank data column.
 */
function splitNameColumn(columns: BoardColumn[]): {
  nameColumn: BoardColumn | undefined
  dataColumns: BoardColumn[]
} {
  return {
    nameColumn: columns.find(col => col.column_id === 'name'),
    dataColumns: columns.filter(col => col.column_id !== 'name'),
  }
}

/**
 * Build a single item's row cells (Name + one cell per column)
 */
function buildItemRow(
  item: BoardItem,
  columns: BoardColumn[],
  lookups: ExportLookups | undefined,
  keepNumbers: boolean
): (string | number | boolean)[] {
  const rowData: (string | number | boolean)[] = [item.name || 'Unnamed']

  columns.forEach(col => {
    const value = item.data?.[col.column_id]
    const displayValue = formatCellValue(value, col, lookups)

    if (keepNumbers && col.column_type === 'number' && typeof value === 'number') {
      rowData.push(value)
    } else {
      rowData.push(displayValue)
    }
  })

  return rowData
}

/**
 * Build export rows, grouping items into sections when the board has more than
 * one visible group. Reuses flattenGroupsForVirtualization \u2014 the same function
 * that drives on-screen group/item ordering \u2014 so exports stay in lockstep with
 * whatever the board view actually shows.
 */
function buildExportRows(
  items: BoardItem[],
  columns: BoardColumn[],
  groups: BoardGroup[] | undefined,
  preserveItemOrder: boolean,
  lookups: ExportLookups | undefined,
  keepNumbers: boolean
): ExportRow[] {
  if (!groups || groups.length <= 1) {
    return items.map(item => ({ cells: buildItemRow(item, columns, lookups, keepNumbers), item }))
  }

  const flattened = flattenGroupsForVirtualization({
    groups,
    items,
    collapsedGroups: new Set(),
    preserveItemOrder,
    skipColumnHeaders: true,
    hideFooters: true,
  })

  const rows: ExportRow[] = []
  for (const row of flattened) {
    if (row.type === 'group-header') {
      const group = row.data as BoardGroup
      rows.push({ cells: [group.name], groupHeader: group })
    } else if (row.type === 'item') {
      const item = row.data as BoardItem
      rows.push({ cells: buildItemRow(item, columns, lookups, keepNumbers), item })
    }
  }
  return rows
}

/**
 * Export board data to CSV format
 */
export function exportToCSV({
  items,
  columns,
  boardName,
  lookups,
  groups,
  preserveItemOrder,
}: ExportOptions): void {
  const { nameColumn, dataColumns } = splitNameColumn(columns)

  // Build headers
  const headers = [nameColumn?.column_name || 'Name', ...dataColumns.map(col => col.column_name)]

  // Build rows (group-header rows only present when the board has >1 group)
  const exportRows = buildExportRows(
    items,
    dataColumns,
    groups,
    !!preserveItemOrder,
    lookups,
    false
  )

  // Convert to CSV string
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...exportRows.map(row =>
      headers.map((_, i) => `"${String(row.cells[i] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  // Download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${sanitizeFilename(boardName)}_${formatDate()}.csv`)
}

/**
 * Export board data to Excel format (XLSX)
 * Uses xlsx-js-style — an API-compatible fork of xlsx (SheetJS) that also
 * supports writing cell styles — to produce a real OOXML binary. A
 * hand-rolled XML/.xls text file gets misdetected by Excel/LibreOffice
 * as a legacy binary workbook and its UTF-8 bytes (Georgian text) get
 * reinterpreted as Windows-1252, producing mojibake. Styling (fill/font)
 * is used to render group-header rows as a colored banner, matching the
 * on-screen group section headers.
 */
export async function exportToExcel({
  items,
  columns,
  boardName,
  lookups,
  groups,
  preserveItemOrder,
}: ExportOptions): Promise<void> {
  const XLSX = await import('xlsx-js-style')

  const { nameColumn, dataColumns } = splitNameColumn(columns)

  // Build headers
  const headers = [nameColumn?.column_name || 'Name', ...dataColumns.map(col => col.column_name)]

  // Build rows (group-header rows only present when the board has >1 group)
  const exportRows = buildExportRows(items, dataColumns, groups, !!preserveItemOrder, lookups, true)

  const aoa = [headers, ...exportRows.map(row => headers.map((_, i) => row.cells[i] ?? ''))]
  const worksheet = XLSX.utils.aoa_to_sheet(aoa)

  // Column widths — match the board's current (possibly user-resized) pixel widths
  worksheet['!cols'] = [
    { wpx: nameColumn?.width ?? 150 },
    ...dataColumns.map(col => ({ wpx: col.width ?? 150 })),
  ]

  const setCellStyle = (r: number, c: number, style: Record<string, any>) => {
    const cellAddress = XLSX.utils.encode_cell({ r, c })
    const cell = worksheet[cellAddress] || (worksheet[cellAddress] = { t: 's', v: '' })
    cell.s = style
  }

  // Style + merge group-header rows into a single colored banner cell
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = []
  exportRows.forEach((row, index) => {
    const rowIndex = index + 1 // +1 to account for the column-header row

    if (row.groupHeader) {
      const rgb = (row.groupHeader.color || '#579bfc').replace('#', '').toUpperCase()
      for (let col = 0; col < headers.length; col++) {
        setCellStyle(rowIndex, col, {
          fill: { fgColor: { rgb }, patternType: 'solid' },
          font: { bold: true, color: { rgb: 'FFFFFF' } },
        })
      }
      merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: headers.length - 1 } })
      return
    }

    // Color status cells to match their on-screen pill
    if (row.item) {
      dataColumns.forEach((col, colIndex) => {
        if (col.column_type !== 'status') return
        const rawValue = row.item!.data?.[col.column_id]
        const colorInfo = getStatusColorForValue(rawValue ? String(rawValue) : '', col)
        setCellStyle(rowIndex, colIndex + 1, {
          fill: { fgColor: { rgb: colorInfo.hex.replace('#', '') }, patternType: 'solid' },
          font: { color: { rgb: colorInfo.text.replace('#', '') } },
        })
      })
    }
  })
  if (merges.length > 0) {
    worksheet['!merges'] = [...(worksheet['!merges'] || []), ...merges]
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, boardName.substring(0, 31))

  const wbBytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbBytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(blob, `${sanitizeFilename(boardName)}_${formatDate()}.xlsx`)
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
