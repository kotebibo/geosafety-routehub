import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportToCSV, exportToExcel } from '@/features/boards/utils/exportBoard'
import type { BoardItem, BoardColumn, BoardGroup } from '@/types/board'

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

const columns: BoardColumn[] = [makeColumn({ column_id: 'notes', column_name: 'Notes' })]

const groupA: BoardGroup = {
  id: 'ga',
  board_id: 'board-1',
  name: 'Group A',
  color: '#579bfc',
  position: 0,
}
const groupB: BoardGroup = {
  id: 'gb',
  board_id: 'board-1',
  name: 'Group B',
  color: '#e2445c',
  position: 1,
}

// Capture the Blob passed to URL.createObjectURL so we can inspect file contents.
// jsdom's Blob lacks .text()/.arrayBuffer(), so read it back via FileReader instead.
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

describe('exportToCSV grouping', () => {
  it('stays flat when there is only one group (no regression)', async () => {
    const items = [
      makeItem({ id: '1', name: 'Alpha', group_id: 'ga', position: 0, data: { notes: 'x' } }),
      makeItem({ id: '2', name: 'Beta', group_id: 'ga', position: 1, data: { notes: 'y' } }),
    ]

    exportToCSV({ format: 'csv', items, columns, boardName: 'Board', groups: [groupA] })

    const text = await readBlobAsText(capturedBlobs[0])
    const lines = text.replace('﻿', '').split('\n')
    expect(lines).toEqual(['"Name","Notes"', '"Alpha","x"', '"Beta","y"'])
  })

  it('emits group-header rows and buckets items by group when there are >1 groups', async () => {
    const items = [
      makeItem({ id: '1', name: 'Alpha', group_id: 'gb', position: 0, data: { notes: 'x' } }),
      makeItem({ id: '2', name: 'Beta', group_id: 'ga', position: 0, data: { notes: 'y' } }),
      makeItem({ id: '3', name: 'Gamma', group_id: 'gb', position: 1, data: { notes: 'z' } }),
    ]

    exportToCSV({ format: 'csv', items, columns, boardName: 'Board', groups: [groupA, groupB] })

    const text = await readBlobAsText(capturedBlobs[0])
    const lines = text.replace('﻿', '').split('\n')
    expect(lines).toEqual([
      '"Name","Notes"',
      '"Group A",""',
      '"Beta","y"',
      '"Group B",""',
      '"Alpha","x"',
      '"Gamma","z"',
    ])
  })

  it('respects preserveItemOrder (active sort) instead of item.position within a group', async () => {
    const items = [
      makeItem({ id: '1', name: 'Zeta', group_id: 'ga', position: 5, data: {} }),
      makeItem({ id: '2', name: 'Alpha', group_id: 'ga', position: 1, data: {} }),
    ]

    exportToCSV({
      format: 'csv',
      items,
      columns,
      boardName: 'Board',
      groups: [groupA, groupB],
      preserveItemOrder: true,
    })

    const text = await readBlobAsText(capturedBlobs[0])
    const lines = text.replace('﻿', '').split('\n')
    // Incoming array order (Zeta, then Alpha) preserved despite position 5 > 1
    expect(lines[1]).toBe('"Group A",""')
    expect(lines[2]).toBe('"Zeta",""')
    expect(lines[3]).toBe('"Alpha",""')
  })

  it('assigns items with no group_id to the first group by position, like on-screen rendering', async () => {
    const items = [makeItem({ id: '1', name: 'Orphan', group_id: null, data: {} })]

    exportToCSV({ format: 'csv', items, columns, boardName: 'Board', groups: [groupA, groupB] })

    const text = await readBlobAsText(capturedBlobs[0])
    const lines = text.replace('﻿', '').split('\n')
    // Group B still gets a (empty) header row, same as an empty group renders on screen
    expect(lines).toEqual(['"Name","Notes"', '"Group A",""', '"Orphan",""', '"Group B",""'])
  })
})

describe('exportToExcel grouping', () => {
  it('writes a merged, colored, bold banner row per group', async () => {
    const items = [
      makeItem({ id: '1', name: 'Alpha', group_id: 'ga', data: {} }),
      makeItem({ id: '2', name: 'Beta', group_id: 'gb', data: {} }),
    ]

    await exportToExcel({
      format: 'excel',
      items,
      columns,
      boardName: 'Board',
      groups: [groupA, groupB],
    })

    const buf = await readBlobAsArrayBuffer(capturedBlobs[0])
    const XLSX = await import('xlsx-js-style')
    const wb = XLSX.read(buf, { type: 'array', cellStyles: true })
    const sheet = wb.Sheets[wb.SheetNames[0]]

    // Row 0 = column header, row 1 = Group A banner, row 2 = Alpha, row 3 = Group B banner, row 4 = Beta
    // Note: xlsx-js-style's reader flattens `.s.fill.fgColor` to `.s.fgColor` and doesn't
    // round-trip `.s.font` on read, even though the underlying OOXML is written correctly
    // (verified manually: xl/styles.xml contains `<b/><color rgb="FFFFFF"/>` on the font
    // and `patternType="solid"` fills with the group's color) — so fill color/pattern is
    // asserted here as the reliable, reader-visible signal that styling was applied.
    expect(sheet['A2'].v).toBe('Group A')
    expect(sheet['A2'].s.fgColor.rgb).toBe('579BFC')
    expect(sheet['A2'].s.patternType).toBe('solid')
    expect(sheet['A3'].v).toBe('Alpha')
    expect(sheet['A4'].v).toBe('Group B')
    expect(sheet['A4'].s.fgColor.rgb).toBe('E2445C')
    expect(sheet['A5'].v).toBe('Beta')

    expect(sheet['!merges']).toEqual(
      expect.arrayContaining([
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
      ])
    )
  })

  it('stays flat with no group rows when there is only one group', async () => {
    const items = [makeItem({ id: '1', name: 'Alpha', group_id: 'ga', data: {} })]

    await exportToExcel({ format: 'excel', items, columns, boardName: 'Board', groups: [groupA] })

    const buf = await readBlobAsArrayBuffer(capturedBlobs[0])
    const XLSX = await import('xlsx-js-style')
    const wb = XLSX.read(buf, { type: 'array', cellStyles: true })
    const sheet = wb.Sheets[wb.SheetNames[0]]

    expect(sheet['A2'].v).toBe('Alpha')
    expect(sheet['!merges'] ?? []).toEqual([])
  })
})
