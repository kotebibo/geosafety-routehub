// Boards feature exports
export * from './components'
export * from './hooks'
export * from './services/boards.service'
// Note: types/board exports BoardTableProps which conflicts with components/BoardTable/types
// Import types directly from '@/types/board' or '@/features/boards/types/board' instead
export type {
  BoardType,
  ColumnType,
  SortDirection,
  Board,
  BoardSettings,
  BoardItem,
  BoardColumn,
  BoardGroup,
  BoardView,
  BoardFilter,
  SortConfig,
  ColumnConfig,
  BoardRow,
  BoardState,
  BoardCellProps,
  BoardToolbarProps,
  BoardMember,
  BoardTemplate,
  BoardPresence,
  ItemUpdate,
  ItemComment,
  UpdateType,
  GlobalSearchResult,
  GlobalSearchBoardGroup,
} from './types/board'
