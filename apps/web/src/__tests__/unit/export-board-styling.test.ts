import { describe, it, expect, vi, beforeEach } from 'vitest'
import { execFileSync } from 'child_process'
import { writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { exportToCSV, exportToExcel } from '@/features/boards/utils/exportBoard'
import type { BoardItem, BoardColumn } from '@/types/board'

function makeItem(overrides: Partial<BoardItem>): BoardItem {
  return {
    id: overrides.id ?? 'item',
    board_id: 'board-1',
    group_id: null,
    position: 0,
    data: {},
    name: 'Item',
    status: 'default',
    assigned_to: null,
    due_date: null,
    priority: 0,
    created_by: null,
    deleted_at: null,
    original_board_id: null,
    move_metadata: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  }
}

function makeColumn(overrides: Partial<BoardColumn>): BoardColumn {
  return {
    id: overrides.column_id ?? 'col',
    board_type: 'custom',
    board_id: 'board-1',
    column_id: 'col',
    column_name: 'Col',
    column_name_ka: null,
    column_type: 'text',
    is_visible: true,
    is_pinned: false,
    position: 0,
    width: 150,
    config: {},
    created_at: null,
    updated_at: null,
    ...overrides,
  } as BoardColumn
}

const nameColumn = makeColumn({
  column_id: 'name',
  column_name: 'Route Name',
  column_type: 'text',
  width: 260,
  is_pinned: true,
})

const statusColumn = makeColumn({
  column_id: 'status_col',
  column_name: 'Status',
  column_type: 'status',
  width: 130,
  config: {
    options: [
      { key: 'not_started', label: 'Not Started', color: 'explosive' },
      { key: 'in_progress', label: 'In Progress', color: 'working_orange' },
      { key: 'done', label: 'Done', color: 'grass_green' },
    ],
  },
})

const notesColumn = makeColumn({ column_id: 'notes', column_name: 'Notes', width: 220 })

const columns: BoardColumn[] = [nameColumn, statusColumn, notesColumn]

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = reject
    fr.readAsText(blob)
  })
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as ArrayBuffer)
    fr.onerror = reject
    fr.readAsArrayBuffer(blob)
  })
}

// xlsx-js-style's reader doesn't round-trip `!cols` back onto the in-memory
// worksheet object (confirmed: writes correct <col width=".."/> XML, but
// XLSX.read()/.readFile() both return `undefined` for `sheet['!cols']`).
// Read the real generated OOXML directly instead of trusting the JS reader.
function extractColWidths(buf: ArrayBuffer): number[] {
  const dir = mkdtempSync(join(tmpdir(), 'xlsx-col-check-'))
  const filePath = join(dir, 'test.xlsx')
  writeFileSync(filePath, Buffer.from(buf))
  const xml = execFileSync('unzip', ['-p', filePath, 'xl/worksheets/sheet1.xml']).toString()
  const cols: { min: number; width: number }[] = []
  for (const match of xml.matchAll(/<col min="(\d+)"[^>]*width="([\d.]+)"/g)) {
    cols.push({ min: Number(match[1]), width: Number(match[2]) })
  }
  return cols.sort((a, b) => a.min - b.min).map(c => c.width)
}

let capturedBlobs: Blob[] = []

beforeEach(() => {
  capturedBlobs = []
  vi.stubGlobal('URL', {
    createObjectURL: (blob: Blob) => {
      capturedBlobs.push(blob)
      return 'blob:mock'
    },
    revokeObjectURL: () => {},
  })
})

describe('exportToCSV — name column + status defaulting', () => {
  it('uses the real name column label and does not duplicate it as a blank data column', async () => {
    const items = [makeItem({ id: '1', name: 'Alpha', data: { status_col: 'done', notes: 'x' } })]

    exportToCSV({ format: 'csv', items, columns, boardName: 'Board' })

    const text = await readBlobAsText(capturedBlobs[0])
    const lines = text.replace('﻿', '').split('\n')
    expect(lines).toEqual(['"Route Name","Status","Notes"', '"Alpha","Done","x"'])
  })

  it('defaults an unset status to the first configured option label, matching the on-screen pill', async () => {
    const items = [makeItem({ id: '1', name: 'Beta', data: {} })]

    exportToCSV({ format: 'csv', items, columns, boardName: 'Board' })

    const text = await readBlobAsText(capturedBlobs[0])
    const lines = text.replace('﻿', '').split('\n')
    expect(lines[1]).toBe('"Beta","Not Started",""')
  })
})

describe('exportToExcel — status colors + column widths', () => {
  it('colors an explicitly-set status cell to match its configured color', async () => {
    const items = [makeItem({ id: '1', name: 'Alpha', data: { status_col: 'done' } })]

    await exportToExcel({ format: 'excel', items, columns, boardName: 'Board' })

    const buf = await readBlobAsArrayBuffer(capturedBlobs[0])
    const XLSX = await import('xlsx-js-style')
    const wb = XLSX.read(buf, { type: 'array', cellStyles: true })
    const sheet = wb.Sheets[wb.SheetNames[0]]

    expect(sheet['B2'].v).toBe('Done')
    // grass_green
    expect(sheet['B2'].s.fgColor.rgb).toBe('00C875')
  })

  it('colors an unset status cell with the first option’s color (default pill)', async () => {
    const items = [makeItem({ id: '1', name: 'Beta', data: {} })]

    await exportToExcel({ format: 'excel', items, columns, boardName: 'Board' })

    const buf = await readBlobAsArrayBuffer(capturedBlobs[0])
    const XLSX = await import('xlsx-js-style')
    const wb = XLSX.read(buf, { type: 'array', cellStyles: true })
    const sheet = wb.Sheets[wb.SheetNames[0]]

    expect(sheet['B2'].v).toBe('Not Started')
    // explosive
    expect(sheet['B2'].s.fgColor.rgb).toBe('C4C4C4')
  })

  it('sets column widths from each column’s current width, including the name column', async () => {
    const items = [makeItem({ id: '1', name: 'Alpha', data: { status_col: 'done', notes: 'x' } })]

    await exportToExcel({ format: 'excel', items, columns, boardName: 'Board' })

    const buf = await readBlobAsArrayBuffer(capturedBlobs[0])
    const widths = extractColWidths(buf)

    // name=260px, status=130px, notes=220px — order must be preserved and
    // proportional after the pixel -> Excel character-unit conversion
    expect(widths).toHaveLength(3)
    expect(widths[0]).toBeGreaterThan(widths[2])
    expect(widths[2]).toBeGreaterThan(widths[1])
  })
})
