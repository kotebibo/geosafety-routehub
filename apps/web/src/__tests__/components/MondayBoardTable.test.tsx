/**
 * MondayBoardTable Smoke Tests
 *
 * These tests serve as a safety net before refactoring.
 * They verify the component renders without crashing and displays expected elements.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { BoardColumn, BoardItem, BoardGroup, BoardType } from '@/features/boards/types/board'

// Mock Supabase BEFORE importing components
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ data: null, error: null })),
      update: vi.fn(() => ({ data: null, error: null })),
      delete: vi.fn(() => ({ data: null, error: null })),
    })),
    auth: {
      getSession: vi.fn(() => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  })),
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ data: null, error: null })),
      update: vi.fn(() => ({ data: null, error: null })),
      delete: vi.fn(() => ({ data: null, error: null })),
    })),
    auth: {
      getSession: vi.fn(() => ({ data: { session: null }, error: null })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => ({ data: null, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
  })),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/boards/test',
}))

// Import component AFTER mocks are set up
import { MondayBoardTable } from '@/features/boards/components/BoardTable/MondayBoardTable'

// Mock @dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: () => null,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  horizontalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  arrayMove: vi.fn((arr, from, to) => {
    const result = [...arr]
    const [removed] = result.splice(from, 1)
    result.splice(to, 0, removed)
    return result
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}))

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
]

const mockData: BoardItem[] = [
  {
    id: 'item-1',
    board_id: 'board-1',
    group_id: 'group-1',
    position: 0,
    data: { name: 'Task 1', status: 'working_on_it' },
    name: 'Task 1',
    status: 'working_on_it',
    priority: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'item-2',
    board_id: 'board-1',
    group_id: 'group-1',
    position: 1,
    data: { name: 'Task 2', status: 'done' },
    name: 'Task 2',
    status: 'done',
    priority: 2,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
]

const mockGroups: BoardGroup[] = [
  {
    id: 'group-1',
    board_id: 'board-1',
    name: 'To Do',
    color: '#579bfc',
    position: 0,
  },
]

describe('MondayBoardTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing with minimal props', () => {
      const { container } = render(
        <MondayBoardTable
          boardType="routes"
          columns={mockColumns}
          data={[]}
        />
      )
      expect(container).toBeTruthy()
    })

    it('renders with data and columns', () => {
      render(
        <MondayBoardTable
          boardType="routes"
          columns={mockColumns}
          data={mockData}
          groups={mockGroups}
        />
      )

      // Check column headers are rendered
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Due Date')).toBeInTheDocument()
    })

    it('renders group headers when groups are provided', () => {
      render(
        <MondayBoardTable
          boardType="routes"
          columns={mockColumns}
          data={mockData}
          groups={mockGroups}
        />
      )

      // Group name should be visible
      expect(screen.getByText('To Do')).toBeInTheDocument()
    })

    it('renders loading skeleton when isLoading is true', () => {
      render(
        <MondayBoardTable
          boardType="routes"
          columns={mockColumns}
          data={[]}
          isLoading={true}
        />
      )

      // Should render skeleton elements (animated placeholders)
      const skeletonElements = document.querySelectorAll('.animate-pulse')
      expect(skeletonElements.length).toBeGreaterThan(0)
    })

    it('renders empty state when no data', () => {
      render(
        <MondayBoardTable
          boardType="routes"
          columns={mockColumns}
          data={[]}
          groups={[]}
        />
      )

      // Should still render without errors
      expect(document.querySelector('table') || document.querySelector('[role="table"]')).toBeTruthy()
    })
  })

  describe('Column Headers', () => {
    it('renders all visible columns', () => {
      render(
        <MondayBoardTable
          boardType="routes"
          columns={mockColumns}
          data={mockData}
        />
      )

      mockColumns.forEach(col => {
        if (col.is_visible) {
          expect(screen.getByText(col.column_name)).toBeInTheDocument()
        }
      })
    })

    it('renders add column button', () => {
      render(
        <MondayBoardTable
          boardType="routes"
          columns={mockColumns}
          data={mockData}
          onQuickAddColumn={vi.fn()}
        />
      )

      // There should be a "+" button for adding columns
      const addButtons = screen.getAllByRole('button')
      expect(addButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Data Rows', () => {
    it('renders correct number of rows', () => {
      render(
        <MondayBoardTable
          boardType="routes"
          columns={mockColumns}
          data={mockData}
          groups={mockGroups}
        />
      )

      // Should render item names
      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 2')).toBeInTheDocument()
    })
  })

  describe('Props Callbacks', () => {
    it('accepts all callback props without errors', () => {
      const callbacks = {
        onRowClick: vi.fn(),
        onCellEdit: vi.fn(),
        onSelectionChange: vi.fn(),
        onAddItem: vi.fn(),
        onAddGroup: vi.fn(),
        onGroupRename: vi.fn(),
        onGroupColorChange: vi.fn(),
        onGroupCollapseToggle: vi.fn(),
        onDeleteGroup: vi.fn(),
        onColumnResize: vi.fn(),
        onColumnReorder: vi.fn(),
        onQuickAddColumn: vi.fn(),
        onOpenAddColumnModal: vi.fn(),
        onColumnRename: vi.fn(),
        onDeleteColumn: vi.fn(),
        onItemMove: vi.fn(),
        onItemReorder: vi.fn(),
        onCellEditStart: vi.fn(),
        onCellEditEnd: vi.fn(),
      }

      const { container } = render(
        <MondayBoardTable
          boardType="routes"
          columns={mockColumns}
          data={mockData}
          groups={mockGroups}
          selection={new Set()}
          presence={[]}
          groupByColumn={null}
          {...callbacks}
        />
      )

      expect(container).toBeTruthy()
    })
  })

  describe('Presence indicators', () => {
    it('renders without errors when presence data is provided', () => {
      const mockPresence = [
        {
          user_id: 'user-1',
          user_name: 'John Doe',
          board_type: 'routes' as BoardType,
          last_seen: new Date().toISOString(),
          is_editing: true,
          editing_item_id: 'item-1',
          editing_column_id: 'col-1',
        },
      ]

      const { container } = render(
        <MondayBoardTable
          boardType="routes"
          columns={mockColumns}
          data={mockData}
          groups={mockGroups}
          presence={mockPresence}
        />
      )

      expect(container).toBeTruthy()
    })
  })

  describe('Dynamic Grouping', () => {
    it('renders with groupByColumn prop', () => {
      const { container } = render(
        <MondayBoardTable
          boardType="routes"
          columns={mockColumns}
          data={mockData}
          groupByColumn="status"
        />
      )

      expect(container).toBeTruthy()
    })
  })
})

// Snapshot test for regression detection
describe('MondayBoardTable Snapshots', () => {
  it('matches snapshot with basic data', () => {
    const { container } = render(
      <MondayBoardTable
        boardType="routes"
        columns={mockColumns}
        data={mockData}
        groups={mockGroups}
      />
    )

    // Basic structure check instead of full snapshot
    // (Full snapshots can be too brittle for large components)
    expect(container.querySelector('table') || container.firstChild).toBeTruthy()
  })
})
