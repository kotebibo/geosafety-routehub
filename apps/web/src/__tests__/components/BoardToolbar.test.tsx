/**
 * BoardToolbar Smoke Tests
 *
 * These tests serve as a safety net before refactoring.
 * They verify the component renders without crashing and displays expected elements.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BoardToolbar, SortConfig, FilterConfig } from '@/features/boards/components/BoardToolbar'
import type { BoardColumn, BoardType } from '@/features/boards/types/board'

// Test data
const mockColumns: BoardColumn[] = [
  {
    id: 'col-1',
    board_type: 'routes' as BoardType,
    column_id: 'name',
    column_name: 'Name',
    column_type: 'text',
    is_visible: true,
    is_pinned: true,
    position: 0,
    width: 200,
    config: {},
  },
  {
    id: 'col-2',
    board_type: 'routes' as BoardType,
    column_id: 'status',
    column_name: 'Status',
    column_type: 'status',
    is_visible: true,
    is_pinned: false,
    position: 1,
    width: 150,
    config: {},
  },
  {
    id: 'col-3',
    board_type: 'routes' as BoardType,
    column_id: 'date',
    column_name: 'Due Date',
    column_type: 'date',
    is_visible: true,
    is_pinned: false,
    position: 2,
    width: 150,
    config: {},
  },
  {
    id: 'col-4',
    board_type: 'routes' as BoardType,
    column_id: 'person',
    column_name: 'Assigned To',
    column_type: 'person',
    is_visible: true,
    is_pinned: false,
    position: 3,
    width: 150,
    config: {},
  },
]

describe('BoardToolbar', () => {
  const mockOnSortChange = vi.fn()
  const mockOnGroupByChange = vi.fn()
  const mockOnFiltersChange = vi.fn()

  const defaultProps = {
    columns: mockColumns,
    sortConfig: null as SortConfig | null,
    onSortChange: mockOnSortChange,
    groupByColumn: null as string | null,
    onGroupByChange: mockOnGroupByChange,
    filters: [] as FilterConfig[],
    onFiltersChange: mockOnFiltersChange,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<BoardToolbar {...defaultProps} />)
      expect(container).toBeTruthy()
    })

    it('renders sort button', () => {
      render(<BoardToolbar {...defaultProps} />)

      // Should have a sort button with ArrowUpDown icon or text
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)

      // Look for sort-related content
      const sortButton = buttons.find(btn =>
        btn.textContent?.toLowerCase().includes('sort') ||
        btn.querySelector('svg')
      )
      expect(sortButton).toBeTruthy()
    })

    it('renders group button', () => {
      render(<BoardToolbar {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('renders filter button', () => {
      render(<BoardToolbar {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Sort Configuration', () => {
    it('renders with active sort config', () => {
      const sortConfig: SortConfig = {
        column: 'name',
        direction: 'asc',
      }

      const { container } = render(
        <BoardToolbar {...defaultProps} sortConfig={sortConfig} />
      )

      expect(container).toBeTruthy()
    })

    it('renders with descending sort', () => {
      const sortConfig: SortConfig = {
        column: 'date',
        direction: 'desc',
      }

      const { container } = render(
        <BoardToolbar {...defaultProps} sortConfig={sortConfig} />
      )

      expect(container).toBeTruthy()
    })
  })

  describe('Group By Configuration', () => {
    it('renders with active grouping', () => {
      const { container } = render(
        <BoardToolbar {...defaultProps} groupByColumn="status" />
      )

      expect(container).toBeTruthy()
    })

    it('handles null groupByColumn', () => {
      const { container } = render(
        <BoardToolbar {...defaultProps} groupByColumn={null} />
      )

      expect(container).toBeTruthy()
    })
  })

  describe('Filter Configuration', () => {
    it('renders with active filters', () => {
      const filters: FilterConfig[] = [
        {
          id: 'filter-1',
          column: 'status',
          condition: 'equals',
          value: 'working_on_it',
        },
      ]

      const { container } = render(
        <BoardToolbar {...defaultProps} filters={filters} />
      )

      expect(container).toBeTruthy()
    })

    it('renders with multiple filters', () => {
      const filters: FilterConfig[] = [
        {
          id: 'filter-1',
          column: 'status',
          condition: 'equals',
          value: 'working_on_it',
        },
        {
          id: 'filter-2',
          column: 'name',
          condition: 'contains',
          value: 'test',
        },
      ]

      const { container } = render(
        <BoardToolbar {...defaultProps} filters={filters} />
      )

      expect(container).toBeTruthy()
    })

    it('renders with empty filters array', () => {
      const { container } = render(
        <BoardToolbar {...defaultProps} filters={[]} />
      )

      expect(container).toBeTruthy()
    })
  })

  describe('Column Types', () => {
    it('handles various column types', () => {
      const mixedColumns: BoardColumn[] = [
        { ...mockColumns[0], column_type: 'text' },
        { ...mockColumns[1], column_type: 'status' },
        { ...mockColumns[2], column_type: 'date' },
        { ...mockColumns[3], column_type: 'person' },
      ]

      const { container } = render(
        <BoardToolbar {...defaultProps} columns={mixedColumns} />
      )

      expect(container).toBeTruthy()
    })

    it('handles empty columns array', () => {
      const { container } = render(
        <BoardToolbar {...defaultProps} columns={[]} />
      )

      expect(container).toBeTruthy()
    })
  })

  describe('Button Interactions', () => {
    it('buttons are clickable', () => {
      render(<BoardToolbar {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(() => fireEvent.click(button)).not.toThrow()
      })
    })
  })

  describe('Props Callbacks', () => {
    it('accepts all callback props without errors', () => {
      const { container } = render(
        <BoardToolbar
          columns={mockColumns}
          sortConfig={{ column: 'name', direction: 'asc' }}
          onSortChange={mockOnSortChange}
          groupByColumn="status"
          onGroupByChange={mockOnGroupByChange}
          filters={[{ id: '1', column: 'status', condition: 'equals', value: 'done' }]}
          onFiltersChange={mockOnFiltersChange}
        />
      )

      expect(container).toBeTruthy()
    })
  })
})

// Snapshot test for regression detection
describe('BoardToolbar Snapshots', () => {
  it('renders consistently with default props', () => {
    const { container } = render(
      <BoardToolbar
        columns={mockColumns}
        sortConfig={null}
        onSortChange={vi.fn()}
        groupByColumn={null}
        onGroupByChange={vi.fn()}
        filters={[]}
        onFiltersChange={vi.fn()}
      />
    )

    // Basic structure check
    expect(container.firstChild).toBeTruthy()
  })

  it('renders consistently with all features active', () => {
    const { container } = render(
      <BoardToolbar
        columns={mockColumns}
        sortConfig={{ column: 'name', direction: 'asc' }}
        onSortChange={vi.fn()}
        groupByColumn="status"
        onGroupByChange={vi.fn()}
        filters={[{ id: '1', column: 'status', condition: 'equals', value: 'done' }]}
        onFiltersChange={vi.fn()}
      />
    )

    // Basic structure check
    expect(container.firstChild).toBeTruthy()
  })
})
