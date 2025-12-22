// Lazy load xlsx library for better performance (400KB+ library)
import type { BoardColumn, ColumnType } from '../types/board'

// Dynamic import for xlsx - only loaded when actually needed
let xlsxModule: typeof import('xlsx') | null = null

async function getXLSX() {
  if (!xlsxModule) {
    xlsxModule = await import('xlsx')
  }
  return xlsxModule
}

export interface ParsedRow {
  [key: string]: string
}

export interface ImportMapping {
  sourceColumn: string
  targetColumn: string
  targetColumnType: ColumnType
}

export interface ImportResult {
  success: boolean
  totalRows: number
  importedRows: number
  errors: ImportError[]
  data: ParsedRow[]
}

export interface ImportError {
  row: number
  column?: string
  message: string
}

/**
 * Parse Excel file (xlsx/xls) using SheetJS
 * Handles Monday.com export format where headers may not be on row 1
 * Note: Uses async import to lazy-load xlsx library (~400KB)
 */
export async function parseExcelFile(data: ArrayBuffer): Promise<{ headers: string[]; rows: ParsedRow[] }> {
  try {
    const XLSX = await getXLSX()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    // Convert to array of arrays
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    if (rawData.length === 0) {
      return { headers: [], rows: [] }
    }

    // Find the header row - Monday.com exports have "Name" in the first column of the header row
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i]
      if (row && row[0] === 'Name') {
        headerRowIndex = i
        break
      }
    }

    // Get headers from the identified row
    const headerRow = rawData[headerRowIndex]
    if (!headerRow) {
      return { headers: [], rows: [] }
    }

    const headers = headerRow.map((h: any) => String(h || '').trim()).filter(h => h)

    // Rest are data rows (skip header row)
    const rows: ParsedRow[] = []
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const rowData = rawData[i]
      if (!rowData || rowData.every((v: any) => v === null || v === undefined || String(v).trim() === '')) {
        continue
      }

      // Skip rows that look like group headers (usually just have one cell with text)
      const nonEmptyCells = rowData.filter((v: any) => v !== null && v !== undefined && String(v).trim() !== '')
      if (nonEmptyCells.length <= 1 && rowData[0] && !rowData[1]) {
        continue
      }

      const row: ParsedRow = {}
      headers.forEach((header, index) => {
        const value = rowData[index]
        // Handle dates from Excel (they come as numbers)
        if (typeof value === 'number' && isLikelyDateColumn(header)) {
          // Excel date serial number to JS date
          const date = XLSX.SSF.parse_date_code(value)
          if (date) {
            row[header] = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
          } else {
            row[header] = String(value)
          }
        } else {
          row[header] = value !== null && value !== undefined ? String(value) : ''
        }
      })
      rows.push(row)
    }

    return { headers, rows }
  } catch (error) {
    console.error('Error parsing Excel file:', error)
    return { headers: [], rows: [] }
  }
}

/**
 * Check if a column name looks like it should contain dates
 */
function isLikelyDateColumn(headerName: string): boolean {
  const lowerHeader = headerName.toLowerCase()
  const dateKeywords = ['date', 'თარიღ', 'ვადა', 'დასრულ', 'გაფორმ', 'სწავლ']
  return dateKeywords.some(keyword => lowerHeader.includes(keyword))
}

/**
 * Read file as ArrayBuffer (for Excel files)
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse CSV content into rows
 */
export function parseCSV(content: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  // Parse headers (first line)
  const headers = parseCSVLine(lines[0])

  // Parse data rows
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0 || values.every(v => !v.trim())) continue

    const row: ParsedRow = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
      i++
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      i++
      continue
    }

    current += char
    i++
  }

  result.push(current.trim())
  return result
}

/**
 * Parse Excel XML content (simple XLS format)
 */
export function parseExcelXML(content: string): { headers: string[]; rows: ParsedRow[] } {
  const headers: string[] = []
  const rows: ParsedRow[] = []

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/xml')

    const rowElements = doc.querySelectorAll('Row')

    rowElements.forEach((rowEl, rowIndex) => {
      const cells = rowEl.querySelectorAll('Cell')
      const values: string[] = []

      cells.forEach(cell => {
        const dataEl = cell.querySelector('Data')
        values.push(dataEl?.textContent || '')
      })

      if (rowIndex === 0) {
        // Headers
        values.forEach(v => headers.push(v))
      } else if (values.some(v => v.trim())) {
        // Data row
        const row: ParsedRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        rows.push(row)
      }
    })
  } catch (error) {
    console.error('Error parsing Excel XML:', error)
  }

  return { headers, rows }
}

/**
 * Auto-detect file type and parse text content (CSV or old XLS)
 */
export function parseFile(content: string, filename: string): { headers: string[]; rows: ParsedRow[] } {
  const extension = filename.toLowerCase().split('.').pop()

  if (extension === 'csv') {
    return parseCSV(content)
  } else if (extension === 'xls' || extension === 'xml') {
    return parseExcelXML(content)
  }

  // Default to CSV parsing
  return parseCSV(content)
}

/**
 * Check if file is a modern Excel file (xlsx)
 */
export function isModernExcel(filename: string): boolean {
  const extension = filename.toLowerCase().split('.').pop()
  return extension === 'xlsx' || extension === 'xls'
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'UTF-8')
  })
}

/**
 * Auto-map source columns to target columns by position (order-based)
 * This is the primary mapping method for Monday.com exports where columns are in order
 * First column is assumed to be "Name", rest map to board columns in order
 */
export function autoMapColumnsByOrder(
  sourceHeaders: string[],
  targetColumns: BoardColumn[]
): ImportMapping[] {
  const mappings: ImportMapping[] = []

  sourceHeaders.forEach((sourceHeader, index) => {
    const normalizedSource = normalizeColumnName(sourceHeader)

    // First column (index 0) is typically the item name in Monday.com exports
    if (index === 0) {
      mappings.push({
        sourceColumn: sourceHeader,
        targetColumn: 'name',
        targetColumnType: 'text',
      })
      return
    }

    // Map remaining columns by position (offset by 1 since first is name)
    const targetIndex = index - 1
    if (targetIndex < targetColumns.length) {
      const targetCol = targetColumns[targetIndex]
      mappings.push({
        sourceColumn: sourceHeader,
        targetColumn: targetCol.column_id,
        targetColumnType: targetCol.column_type,
      })
    }
    // Skip columns that don't have a corresponding target
  })

  return mappings
}

/**
 * Auto-map source columns to target columns based on name similarity
 * Fallback method when order-based mapping isn't suitable
 */
export function autoMapColumnsByName(
  sourceHeaders: string[],
  targetColumns: BoardColumn[]
): ImportMapping[] {
  const mappings: ImportMapping[] = []

  sourceHeaders.forEach(sourceHeader => {
    const normalizedSource = normalizeColumnName(sourceHeader)

    // Try to find a matching target column
    let bestMatch: BoardColumn | null = null
    let bestScore = 0

    targetColumns.forEach(targetCol => {
      const normalizedTarget = normalizeColumnName(targetCol.column_name)
      const score = similarityScore(normalizedSource, normalizedTarget)

      if (score > bestScore && score >= 0.5) {
        bestScore = score
        bestMatch = targetCol
      }
    })

    // Also check column_id
    if (!bestMatch) {
      targetColumns.forEach(targetCol => {
        const normalizedTarget = normalizeColumnName(targetCol.column_id)
        const score = similarityScore(normalizedSource, normalizedTarget)

        if (score > bestScore && score >= 0.5) {
          bestScore = score
          bestMatch = targetCol
        }
      })
    }

    // Special case: "Name" or "Item" usually maps to the name field
    if (!bestMatch && (normalizedSource === 'name' || normalizedSource === 'item' || normalizedSource === 'title')) {
      mappings.push({
        sourceColumn: sourceHeader,
        targetColumn: 'name',
        targetColumnType: 'text',
      })
      return
    }

    if (bestMatch) {
      const match = bestMatch as BoardColumn
      mappings.push({
        sourceColumn: sourceHeader,
        targetColumn: match.column_id,
        targetColumnType: match.column_type,
      })
    }
  })

  return mappings
}

/**
 * Auto-map columns - uses order-based mapping by default (best for Monday.com exports)
 * Falls back to name-based mapping if specified
 */
export function autoMapColumns(
  sourceHeaders: string[],
  targetColumns: BoardColumn[],
  method: 'order' | 'name' = 'order'
): ImportMapping[] {
  if (method === 'name') {
    return autoMapColumnsByName(sourceHeaders, targetColumns)
  }
  return autoMapColumnsByOrder(sourceHeaders, targetColumns)
}

/**
 * Normalize column name for comparison
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Simple similarity score between two strings (0-1)
 */
function similarityScore(a: string, b: string): number {
  if (a === b) return 1
  if (a.length === 0 || b.length === 0) return 0

  // Check for substring match
  if (a.includes(b) || b.includes(a)) {
    return 0.8
  }

  // Levenshtein-based similarity
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a

  const editDistance = levenshtein(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

/**
 * Levenshtein distance
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Convert value to the appropriate type for the target column
 */
export function convertValue(value: string, columnType: ColumnType): any {
  if (!value || value.trim() === '') {
    return null
  }

  const trimmed = value.trim()

  switch (columnType) {
    case 'number':
      const num = parseFloat(trimmed.replace(/[,\s]/g, ''))
      return isNaN(num) ? null : num

    case 'checkbox':
      const lower = trimmed.toLowerCase()
      if (['true', 'yes', '1', 'checked', 'x', ''].includes(lower)) {
        return lower !== ''
      }
      return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'checked' || lower === 'x'

    case 'date':
      // Try to parse various date formats
      const date = parseDate(trimmed)
      return date ? date.toISOString().split('T')[0] : null

    case 'status':
      // Convert status text to key format
      return trimmed.toLowerCase().replace(/\s+/g, '_')

    case 'text':
    case 'phone':
    case 'location':
    default:
      return trimmed
  }
}

/**
 * Parse date from various formats
 * Handles date ranges by extracting the start date (e.g., "2025-11-03 to 2026-02-09")
 */
function parseDate(value: string): Date | null {
  // Handle date ranges - Monday.com exports date ranges as "start to end"
  // Extract start date from ranges like "2025-11-03 to 2026-02-09"
  let dateValue = value.trim()
  if (dateValue.includes(' to ')) {
    dateValue = dateValue.split(' to ')[0].trim()
  }

  // Try standard formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY or MM-DD-YYYY
  ]

  for (const format of formats) {
    const match = dateValue.match(format)
    if (match) {
      const [_, p1, p2, p3] = match

      // Try to determine format based on values
      if (format === formats[0]) {
        // YYYY-MM-DD
        return new Date(parseInt(p1), parseInt(p2) - 1, parseInt(p3))
      } else if (format === formats[1]) {
        // MM/DD/YYYY
        return new Date(parseInt(p3), parseInt(p1) - 1, parseInt(p2))
      } else if (format === formats[2]) {
        // DD.MM.YYYY
        return new Date(parseInt(p3), parseInt(p2) - 1, parseInt(p1))
      } else {
        // Try DD-MM-YYYY first, then MM-DD-YYYY
        const day = parseInt(p1)
        const month = parseInt(p2)
        if (day > 12) {
          // Must be DD-MM-YYYY
          return new Date(parseInt(p3), month - 1, day)
        } else if (month > 12) {
          // Must be MM-DD-YYYY
          return new Date(parseInt(p3), day - 1, month)
        } else {
          // Assume DD-MM-YYYY (European format)
          return new Date(parseInt(p3), month - 1, day)
        }
      }
    }
  }

  // Try native Date parsing as fallback
  const parsed = new Date(dateValue)
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Transform parsed rows using mappings into board item data
 */
export function transformRows(
  rows: ParsedRow[],
  mappings: ImportMapping[],
  defaultGroupId: string = 'default'
): Array<{
  name: string
  data: Record<string, any>
  group_id: string
}> {
  return rows.map((row, index) => {
    const data: Record<string, any> = {
      group_id: defaultGroupId,
    }
    let name = `Item ${index + 1}`

    mappings.forEach(mapping => {
      const sourceValue = row[mapping.sourceColumn]

      if (mapping.targetColumn === 'name') {
        name = sourceValue || name
      } else {
        const convertedValue = convertValue(sourceValue, mapping.targetColumnType)
        if (convertedValue !== null) {
          data[mapping.targetColumn] = convertedValue
        }
      }
    })

    return {
      name,
      data,
      group_id: defaultGroupId,
    }
  })
}

/**
 * Validate import data
 */
export function validateImport(
  rows: ParsedRow[],
  mappings: ImportMapping[]
): ImportError[] {
  const errors: ImportError[] = []

  // Check if we have at least one mapping
  if (mappings.length === 0) {
    errors.push({
      row: 0,
      message: 'No column mappings defined. Please map at least one column.',
    })
    return errors
  }

  // Check for name mapping
  const hasNameMapping = mappings.some(m => m.targetColumn === 'name')
  if (!hasNameMapping) {
    errors.push({
      row: 0,
      message: 'No "Name" column mapped. Items will be named "Item 1", "Item 2", etc.',
    })
  }

  // Validate each row
  rows.forEach((row, rowIndex) => {
    mappings.forEach(mapping => {
      const value = row[mapping.sourceColumn]

      // Type-specific validation
      if (value && mapping.targetColumnType === 'number') {
        const num = parseFloat(value.replace(/[,\s]/g, ''))
        if (isNaN(num)) {
          errors.push({
            row: rowIndex + 2, // +2 for 1-based index and header row
            column: mapping.sourceColumn,
            message: `Invalid number value: "${value}"`,
          })
        }
      }

      if (value && mapping.targetColumnType === 'date') {
        const date = parseDate(value)
        if (!date) {
          errors.push({
            row: rowIndex + 2,
            column: mapping.sourceColumn,
            message: `Invalid date value: "${value}"`,
          })
        }
      }
    })
  })

  return errors
}
