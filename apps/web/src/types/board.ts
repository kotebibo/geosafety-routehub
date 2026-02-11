// Monday.com-style Board Types

export type BoardType = 'routes' | 'companies' | 'inspectors' | 'inspections' | 'custom'

export type ColumnType =
  | 'text'
  | 'status'
  | 'person'
  | 'date'
  | 'date_range'
  | 'number'
  | 'location'
  | 'actions'
  | 'route'
  | 'company'
  | 'company_address'  // Auto-populated from company+location selection
  | 'service_type'
  | 'checkbox'
  | 'phone'
  | 'files'
  | 'updates'

export type SortDirection = 'asc' | 'desc'

// User-Created Board
export interface Board {
  id: string
  owner_id: string
  workspace_id?: string
  board_type: BoardType
  name: string
  name_ka?: string
  description?: string
  icon?: string
  color?: string
  is_template: boolean
  is_public: boolean
  folder_id?: string
  settings: BoardSettings
  created_at: string
  updated_at: string
}

export interface BoardSettings {
  allowComments: boolean
  allowActivityFeed: boolean
  defaultView: 'table'
  permissions: {
    canEdit: string[]
    canView: string[]
  }
  is_favorite?: boolean
  is_archived?: boolean
}

// Board Item (row in a board)
export interface BoardItem {
  id: string
  board_id: string
  group_id?: string
  position: number
  data: Record<string, any> // Dynamic fields stored as JSONB
  name: string
  status: StatusType
  assigned_to?: string
  due_date?: string
  priority: number
  created_by?: string
  created_at: string
  updated_at: string
  // Fields for item transfer/history tracking
  original_board_id?: string // Original board if item was moved
  move_metadata?: {
    moved_from_board_id?: string
    moved_from_board_name?: string
    moved_at?: string
    column_mapping_used?: Record<string, string> | null
    unmapped_data?: Record<string, unknown> | null
  }
}

// Board Member
export interface BoardMember {
  board_id: string
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
  added_by?: string
  added_at: string
  user?: {
    full_name: string
    email: string
    avatar_url?: string
  }
}

// Board Template
export interface BoardTemplate {
  id: string
  name: string
  name_ka?: string
  description?: string
  board_type: BoardType
  icon: string
  color: string
  category?: string
  default_columns: BoardColumnConfig[]
  default_items: any[]
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface BoardColumnConfig {
  id: string
  name: string
  name_ka?: string
  type: ColumnType
  width: number
  config?: Record<string, any>
}

export type StatusType =
  | 'working_on_it'
  | 'stuck'
  | 'done'
  | 'pending'
  | 'default'

// Board Column Configuration
export interface BoardColumn {
  id: string
  board_type: BoardType
  column_id: string
  column_name: string
  column_name_ka?: string
  column_type: ColumnType
  is_visible: boolean
  is_pinned: boolean
  position: number
  width: number
  config: Record<string, any>
  created_at?: string
  updated_at?: string
}

// Board View (Saved filters/sorts)
export interface BoardView {
  id: string
  user_id: string
  board_type: BoardType
  view_name: string
  view_name_ka?: string
  filters: BoardFilter[]
  sort_config: SortConfig
  column_config: ColumnConfig[]
  is_default: boolean
  is_shared: boolean
  created_at?: string
  updated_at?: string
}

// Filter Configuration
export interface BoardFilter {
  column_id: string
  operator: FilterOperator
  value: any
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_one_of'
  | 'is_not_one_of'
  | 'date_is'
  | 'date_before'
  | 'date_after'
  | 'date_between'

// Sort Configuration
export interface SortConfig {
  column_id: string
  direction: SortDirection
}

// Column Configuration (for saved views)
export interface ColumnConfig {
  column_id: string
  is_visible: boolean
  width?: number
  position?: number
}

// Activity/Update Types
export interface ItemUpdate {
  id: string
  item_type: 'route' | 'company' | 'inspector' | 'inspection' | 'board_item'
  item_id: string
  user_id?: string
  user_name?: string
  update_type: UpdateType
  field_name?: string
  column_id?: string
  column_name?: string // Resolved column name for display
  column_name_ka?: string // Georgian column name for display
  old_value?: string
  new_value?: string
  content?: string
  metadata?: Record<string, any>
  source_board_id?: string
  target_board_id?: string
  source_board_name?: string // Resolved board name for display
  target_board_name?: string // Resolved board name for display
  created_at: string
}

export type UpdateType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'assigned'
  | 'reassigned'
  | 'comment'
  | 'completed'
  | 'column_changed'
  | 'moved_to_board'

// Comment Types
export interface ItemComment {
  id: string
  item_type: 'route' | 'company' | 'inspector' | 'inspection'
  item_id: string
  user_id: string
  user_name?: string
  user_avatar?: string
  parent_comment_id?: string
  content: string
  mentions: string[]
  attachments: string[]
  is_edited: boolean
  created_at: string
  updated_at: string
  replies?: ItemComment[]
}

// Presence Types
export interface BoardPresence {
  user_id: string
  user_name: string
  user_avatar?: string
  board_type: BoardType
  board_id?: string
  last_seen: string
  is_editing: boolean
  editing_item_id?: string
  editing_column_id?: string
}

// User Settings
export interface UserSettings {
  user_id: string
  theme: 'light' | 'dark' | 'auto'
  language: 'ka' | 'en'
  notification_settings: NotificationSettings
  board_preferences: BoardPreferences
  created_at?: string
  updated_at?: string
}

export interface NotificationSettings {
  email_notifications: boolean
  push_notifications: boolean
  activity_feed: boolean
  assignment_changes: boolean
}

export interface BoardPreferences {
  default_view: 'table'
  rows_per_page: number
  auto_refresh: boolean
  show_activity_feed: boolean
}

// Board Data Row (generic)
export interface BoardRow {
  id: string
  [key: string]: any
}

// Board State
export interface BoardState {
  columns: BoardColumn[]
  data: BoardRow[]
  filters: BoardFilter[]
  sort: SortConfig | null
  selectedRows: Set<string>
  editingCell: { rowId: string; columnId: string } | null
  loading: boolean
  error: Error | null
}

// Board Props
export interface BoardTableProps {
  boardType: BoardType
  data: BoardRow[]
  columns: BoardColumn[]
  onRowClick?: (row: BoardRow) => void
  onCellEdit?: (rowId: string, columnId: string, value: any) => Promise<void>
  onRowsReorder?: (newOrder: BoardRow[]) => Promise<void>
  onColumnResize?: (columnId: string, width: number) => void
  onColumnReorder?: (columnIds: string[]) => void
  onSort?: (columnId: string, direction: SortDirection) => void
  onFilter?: (filters: BoardFilter[]) => void
  onSelectionChange?: (selectedIds: Set<string>) => void
  loading?: boolean
  enableVirtualization?: boolean
  enableDragDrop?: boolean
  enableMultiSelect?: boolean
  enableInlineEdit?: boolean
  height?: number | string
}

// Cell Component Props
export interface BoardCellProps {
  row: BoardRow
  column: BoardColumn
  value: any
  isEditing: boolean
  onEdit: () => void
  onSave: (value: any) => Promise<void>
  onCancel: () => void
}

// Global Search Result (from RPC)
export interface GlobalSearchResult {
  item_id: string
  item_name: string
  item_status: string | null
  item_data: Record<string, any>
  item_board_id: string
  item_group_id: string | null
  item_position: number
  item_assigned_to: string | null
  item_due_date: string | null
  item_created_at: string
  board_name: string
  board_color: string | null
  board_icon: string | null
  board_type: string
  matched_field: string
}

// Grouped search results (for rendering as board sections)
export interface GlobalSearchBoardGroup {
  boardId: string
  boardName: string
  boardColor: string | null
  boardIcon: string | null
  boardType: string
  items: GlobalSearchResult[]
}

// Toolbar Props
export interface BoardToolbarProps {
  boardType: BoardType
  currentView?: BoardView
  views: BoardView[]
  filters: BoardFilter[]
  selectedCount: number
  onViewChange: (viewId: string) => void
  onSaveView: (view: Partial<BoardView>) => Promise<void>
  onDeleteView: (viewId: string) => Promise<void>
  onFilterChange: (filters: BoardFilter[]) => void
  onSearch: (query: string) => void
  onExport: () => void
  onBulkAction: (action: string) => void
}
