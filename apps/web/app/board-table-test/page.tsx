'use client'

import { useState } from 'react'
import { BoardTable } from '@/components/boards/BoardTable'
import { Button } from '@/components/ui-monday'
import type { BoardColumn, BoardType } from '@/types/board'

// Mock data for testing
const mockColumns: BoardColumn[] = [
  {
    id: '1',
    board_type: 'routes',
    column_id: 'name',
    column_name: 'Route Name',
    column_name_ka: null,
    column_type: 'text',
    is_visible: true,
    is_pinned: false,
    position: 0,
    width: 200,
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    board_type: 'routes',
    column_id: 'status',
    column_name: 'Status',
    column_name_ka: null,
    column_type: 'status',
    is_visible: true,
    is_pinned: false,
    position: 1,
    width: 150,
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    board_type: 'routes',
    column_id: 'priority',
    column_name: 'Priority',
    column_name_ka: null,
    column_type: 'number',
    is_visible: true,
    is_pinned: false,
    position: 2,
    width: 120,
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    board_type: 'routes',
    column_id: 'date',
    column_name: 'Due Date',
    column_name_ka: null,
    column_type: 'date',
    is_visible: true,
    is_pinned: false,
    position: 3,
    width: 150,
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    board_type: 'routes',
    column_id: 'description',
    column_name: 'Description',
    column_name_ka: null,
    column_type: 'text',
    is_visible: true,
    is_pinned: false,
    position: 4,
    width: 250,
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const generateMockData = (count: number) => {
  const statuses = ['working_on_it', 'stuck', 'done', 'pending', 'default']

  return Array.from({ length: count }, (_, i) => ({
    id: `route-${i + 1}`,
    name: `Route ${i + 1}`,
    status: statuses[i % statuses.length],
    priority: Math.floor(Math.random() * 10) + 1,
    date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: `This is a description for route ${i + 1}`,
  }))
}

export default function BoardTableTestPage() {
  const [data, setData] = useState(generateMockData(100))
  const [selection, setSelection] = useState<Set<string>>(new Set())

  const handleCellEdit = (rowId: string, columnId: string, value: any) => {
    setData((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, [columnId]: value } : row
      )
    )
    console.log('Cell edited:', { rowId, columnId, value })
  }

  const handleRowClick = (row: any) => {
    console.log('Row clicked:', row)
  }

  const handleAddRow = () => {
    const newRow = {
      id: `route-${data.length + 1}`,
      name: `New Route ${data.length + 1}`,
      status: 'default',
      priority: 5,
      date: new Date().toISOString().split('T')[0],
      description: 'New route description',
    }
    setData((prev) => [...prev, newRow])
  }

  const handleDeleteSelected = () => {
    setData((prev) => prev.filter((row) => !selection.has(row.id)))
    setSelection(new Set())
  }

  return (
    <div className="min-h-screen bg-bg-secondary p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="bg-bg-primary border border-border-light rounded-lg p-6 shadow-monday-sm">
          <h1 className="text-h1 font-semibold text-text-primary mb-2">
            BoardTable Component Test
          </h1>
          <p className="text-text-secondary">
            Testing the Monday.com-style board table with virtualization, inline editing, sorting, and selection
          </p>
        </div>

        {/* Controls */}
        <div className="bg-bg-primary border border-border-light rounded-lg p-4 shadow-monday-sm">
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={handleAddRow}>
              + Add Row
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={selection.size === 0}
            >
              Delete Selected ({selection.size})
            </Button>
            <div className="ml-auto text-sm text-text-secondary">
              Total Rows: {data.length}
            </div>
          </div>
        </div>

        {/* Features Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-bg-primary border border-border-light rounded-lg p-4 shadow-monday-sm">
            <h3 className="font-semibold text-text-primary mb-2">✓ Virtualization</h3>
            <p className="text-sm text-text-secondary">
              Efficiently renders 100+ rows using @tanstack/react-virtual
            </p>
          </div>
          <div className="bg-bg-primary border border-border-light rounded-lg p-4 shadow-monday-sm">
            <h3 className="font-semibold text-text-primary mb-2">✓ Inline Editing</h3>
            <p className="text-sm text-text-secondary">
              Click any cell to edit. Different editors for text, status, date, and number
            </p>
          </div>
          <div className="bg-bg-primary border border-border-light rounded-lg p-4 shadow-monday-sm">
            <h3 className="font-semibold text-text-primary mb-2">✓ Sorting & Selection</h3>
            <p className="text-sm text-text-secondary">
              Click headers to sort. Use checkboxes for bulk actions
            </p>
          </div>
        </div>

        {/* Board Table */}
        <BoardTable
          boardType="routes"
          columns={mockColumns}
          data={data}
          onCellEdit={handleCellEdit}
          onRowClick={handleRowClick}
          selection={selection}
          onSelectionChange={setSelection}
          height={600}
        />

        {/* Instructions */}
        <div className="bg-monday-primary/10 border border-monday-primary rounded-lg p-6">
          <h2 className="text-h4 font-semibold text-text-primary mb-3">
            💡 Try These Features
          </h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>• Click any text cell to edit inline</li>
            <li>• Click status cells to open a dropdown picker</li>
            <li>• Click date cells to open a date picker</li>
            <li>• Click column headers to sort (ascending → descending → no sort)</li>
            <li>• Use checkboxes to select rows for bulk actions</li>
            <li>• Try scrolling - the table efficiently handles 100 rows</li>
            <li>• Check the console for edit events</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
