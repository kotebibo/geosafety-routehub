'use client'

// Board sidebar with actions menu
import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import { useUserBoards } from '@/features/boards/hooks'
import { userBoardsService } from '@/features/boards/services/user-boards.service'
import { useQueryClient } from '@tanstack/react-query'
import {
  Home,
  Building2,
  Users,
  Route,
  MapIcon,
  MapPin,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Copy,
  Palette,
  Download,
  Star,
  Archive,
  Trash2,
  X,
  Check,
  Shield,
  KeyRound,
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

interface NavItem {
  href: string
  label: string
  labelEn: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

// Board color mapping
const BOARD_COLORS: Record<string, string> = {
  blue: 'bg-monday-primary',
  green: 'bg-status-done',
  red: 'bg-status-stuck',
  yellow: 'bg-status-working',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  primary: 'bg-monday-primary',
}

// Color picker options for boards
const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', class: 'bg-monday-primary' },
  { value: 'green', label: 'Green', class: 'bg-status-done' },
  { value: 'red', label: 'Red', class: 'bg-status-stuck' },
  { value: 'yellow', label: 'Yellow', class: 'bg-status-working' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
]

// Board type for menu state
interface BoardMenuState {
  boardId: string
  boardName: string
  boardColor?: string
  isFavorite?: boolean
  isArchived?: boolean
  position: { top: number; left: number }
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [boardsExpanded, setBoardsExpanded] = React.useState(true)
  const [showArchived, setShowArchived] = React.useState(false)
  const [menuState, setMenuState] = React.useState<BoardMenuState | null>(null)
  const [showColorPicker, setShowColorPicker] = React.useState(false)
  const [renameMode, setRenameMode] = React.useState(false)
  const [renameValue, setRenameValue] = React.useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)

  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, userRole } = useAuth()
  const { data: inspectorId } = useInspectorId(user?.email)

  // Get the user's role name for filtering nav items
  const currentUserRole = userRole?.role || 'inspector'

  const menuRef = React.useRef<HTMLDivElement>(null)
  const renameInputRef = React.useRef<HTMLInputElement>(null)

  // Fetch user's boards
  const { data: boards, isLoading: boardsLoading } = useUserBoards(inspectorId || '')

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu()
      }
    }

    if (menuState) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuState])

  // Focus rename input when entering rename mode
  React.useEffect(() => {
    if (renameMode && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renameMode])

  const openMenu = (
    e: React.MouseEvent,
    boardId: string,
    boardName: string,
    boardColor?: string,
    isFavorite?: boolean,
    isArchived?: boolean
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setMenuState({
      boardId,
      boardName,
      boardColor,
      isFavorite,
      isArchived,
      position: {
        top: rect.top,
        left: rect.right + 8,
      },
    })
    setRenameValue(boardName)
  }

  const closeMenu = () => {
    setMenuState(null)
    setShowColorPicker(false)
    setRenameMode(false)
    setShowDeleteConfirm(false)
  }

  const refreshBoards = () => {
    // Invalidate all user-boards queries - the key is ['routes', 'user-boards', ...]
    queryClient.invalidateQueries({ queryKey: ['routes', 'user-boards'] })
  }

  // Action handlers
  const handleOpenInNewTab = () => {
    if (!menuState) return
    window.open(`/boards/${menuState.boardId}`, '_blank')
    closeMenu()
  }

  const handleStartRename = () => {
    setRenameMode(true)
  }

  const handleRename = async () => {
    if (!menuState || !renameValue.trim() || actionLoading) return

    setActionLoading(true)
    try {
      await userBoardsService.updateBoard(menuState.boardId, { name: renameValue.trim() })
      refreshBoards()
      closeMenu()
    } catch (error) {
      console.error('Error renaming board:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDuplicate = async () => {
    if (!menuState || !inspectorId || actionLoading) return

    setActionLoading(true)
    try {
      const newBoard = await userBoardsService.duplicateBoard(
        menuState.boardId,
        `${menuState.boardName} (copy)`,
        inspectorId
      )
      refreshBoards()
      closeMenu()
      router.push(`/boards/${newBoard.id}`)
    } catch (error) {
      console.error('Error duplicating board:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeColor = async (color: string) => {
    if (!menuState || actionLoading) return

    setActionLoading(true)
    try {
      await userBoardsService.updateBoard(menuState.boardId, { color })
      refreshBoards()
      setShowColorPicker(false)
    } catch (error) {
      console.error('Error changing board color:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleExport = () => {
    if (!menuState) return
    // Navigate to the board with export action
    router.push(`/boards/${menuState.boardId}?action=export`)
    closeMenu()
  }

  const handleToggleFavorite = async () => {
    if (!menuState || actionLoading) return

    setActionLoading(true)
    try {
      const board = await userBoardsService.getBoard(menuState.boardId)
      await userBoardsService.updateBoard(menuState.boardId, {
        settings: { ...board.settings, is_favorite: !menuState.isFavorite }
      })
      refreshBoards()
      closeMenu()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!menuState || actionLoading) return

    setActionLoading(true)
    try {
      const board = await userBoardsService.getBoard(menuState.boardId)
      await userBoardsService.updateBoard(menuState.boardId, {
        settings: { ...board.settings, is_archived: !menuState.isArchived }
      })
      refreshBoards()
      closeMenu()
    } catch (error) {
      console.error('Error archiving board:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!menuState || actionLoading) return

    setActionLoading(true)
    try {
      await userBoardsService.deleteBoard(menuState.boardId)
      refreshBoards()
      closeMenu()
      // Navigate away if we deleted the current board
      if (pathname === `/boards/${menuState.boardId}`) {
        router.push('/boards')
      }
    } catch (error) {
      console.error('Error deleting board:', error)
    } finally {
      setActionLoading(false)
    }
  }

  // Don't show sidebar on login page
  if (pathname === '/auth/login' || pathname === '/auth/register') {
    return null
  }

  // Check if we're on a board detail page
  const boardIdMatch = pathname.match(/\/boards\/([^/]+)/)
  const currentBoardId = boardIdMatch ? boardIdMatch[1] : null

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'მთავარი',
      labelEn: 'Home',
      icon: Home,
      roles: ['admin', 'dispatcher', 'inspector'],
    },
    {
      href: '/companies',
      label: 'კომპანიები',
      labelEn: 'Companies',
      icon: Building2,
      roles: ['admin', 'dispatcher'],
    },
    {
      href: '/inspectors',
      label: 'ინსპექტორები',
      labelEn: 'Inspectors',
      icon: Users,
      roles: ['admin', 'dispatcher'],
    },
    {
      href: '/locations',
      label: 'ლოკაციები',
      labelEn: 'Locations',
      icon: MapPin,
      roles: ['admin', 'dispatcher'],
    },
    {
      href: '/routes/manage',
      label: 'მარშრუტები',
      labelEn: 'Routes',
      icon: Route,
      roles: ['admin', 'dispatcher', 'inspector'],
    },
    {
      href: '/routes/builder',
      label: 'მარშრუტის შექმნა',
      labelEn: 'Route Builder',
      icon: MapIcon,
      roles: ['admin', 'dispatcher'],
    },
    {
      href: '/admin/assignments',
      label: 'დანიშვნები',
      labelEn: 'Assignments',
      icon: UserCog,
      roles: ['admin', 'dispatcher'],
    },
    {
      href: '/admin/users',
      label: 'მომხმარებლები',
      labelEn: 'User Management',
      icon: Shield,
      roles: ['admin'],
    },
    {
      href: '/admin/roles',
      label: 'როლები',
      labelEn: 'Roles & Permissions',
      icon: KeyRound,
      roles: ['admin'],
    },
    {
      href: '/settings',
      label: 'პარამეტრები',
      labelEn: 'Settings',
      icon: Settings,
      roles: ['admin', 'dispatcher', 'inspector'],
    },
  ]

  const getBoardColor = (color?: string) => {
    return BOARD_COLORS[color || 'primary'] || 'bg-monday-primary'
  }

  return (
    <>
    <aside
      className={cn(
        'flex flex-col flex-shrink-0 h-screen bg-bg-primary border-r border-border-light transition-all duration-normal',
        collapsed ? 'w-16' : 'w-72',
        className
      )}
    >
      {/* Logo Section */}
      <div className="flex-shrink-0 flex items-center h-14 px-4 border-b border-border-light">
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-monday-primary rounded-md flex items-center justify-center text-white font-bold text-sm">
              RH
            </div>
            <span className="font-brand font-semibold text-lg text-text-primary">
              RouteHub
            </span>
          </Link>
        ) : (
          <Link href="/" className="flex items-center justify-center w-full">
            <div className="w-8 h-8 bg-monday-primary rounded-md flex items-center justify-center text-white font-bold text-sm">
              RH
            </div>
          </Link>
        )}
      </div>

      {/* Main Navigation - Top Section */}
      <div className="flex-shrink-0">
        {/* Primary Navigation */}
        <nav className="py-4 px-2">
          <ul className="space-y-1">
            {navItems
              .filter((item) => item.roles.includes(currentUserRole))
              .map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-fast',
                      'hover:bg-bg-hover',
                      isActive
                        ? 'bg-bg-selected text-monday-primary'
                        : 'text-text-primary hover:text-text-primary',
                      collapsed && 'justify-center'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="shrink-0 w-5 h-5" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Boards Section - Takes remaining space with scroll */}
      <div className="flex-1 flex flex-col min-h-0">
        {!collapsed && (
          <div className="flex flex-col h-full px-2">
            {/* Boards Header - Styled like nav items */}
            <button
              onClick={() => setBoardsExpanded(!boardsExpanded)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-fast w-full',
                'hover:bg-bg-hover',
                pathname.startsWith('/boards')
                  ? 'bg-bg-selected text-monday-primary'
                  : 'text-text-primary hover:text-text-primary'
              )}
            >
              <LayoutDashboard className="shrink-0 w-5 h-5" />
              <span className="flex-1 text-left truncate">Boards</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  !boardsExpanded && '-rotate-90'
                )}
              />
            </button>

            {/* Boards List - Scrollable */}
            {boardsExpanded && (
              <div className="flex-1 overflow-y-auto pl-4 mt-1 scrollbar-thin">
                {/* Individual Boards */}
                <div className="space-y-0.5">
                  {boardsLoading ? (
                    <div className="px-3 py-2 text-sm text-text-tertiary">
                      Loading...
                    </div>
                  ) : boards && boards.length > 0 ? (
                    <>
                      {/* Favorites section */}
                      {boards.filter((b: any) => b.settings?.is_favorite && !b.settings?.is_archived).length > 0 && (
                        <>
                          <div className="px-3 py-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                            Favorites
                          </div>
                          {boards
                            .filter((b: any) => b.settings?.is_favorite && !b.settings?.is_archived)
                            .map((board: any) => (
                              <Link
                                key={board.id}
                                href={`/boards/${board.id}`}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-fast group',
                                  'hover:bg-bg-hover',
                                  currentBoardId === board.id
                                    ? 'bg-bg-selected text-monday-primary'
                                    : 'text-text-primary hover:text-text-primary'
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-5 h-5 rounded flex items-center justify-center text-white text-xs font-semibold flex-shrink-0',
                                    getBoardColor(board.color)
                                  )}
                                >
                                  {board.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="flex-1 truncate">{board.name}</span>
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                <button
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-bg-hover rounded transition-opacity flex-shrink-0"
                                  onClick={(e) => openMenu(e, board.id, board.name, board.color, true, false)}
                                >
                                  <MoreHorizontal className="w-4 h-4 text-text-tertiary" />
                                </button>
                              </Link>
                            ))}
                        </>
                      )}
                      {/* Regular boards section */}
                      {boards.filter((b: any) => !b.settings?.is_favorite && !b.settings?.is_archived).length > 0 && (
                        <>
                          {boards.filter((b: any) => b.settings?.is_favorite && !b.settings?.is_archived).length > 0 && (
                            <div className="px-3 py-1 mt-2 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                              All Boards
                            </div>
                          )}
                          {boards
                            .filter((b: any) => !b.settings?.is_favorite && !b.settings?.is_archived)
                            .map((board: any) => (
                              <Link
                                key={board.id}
                                href={`/boards/${board.id}`}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-fast group',
                                  'hover:bg-bg-hover',
                                  currentBoardId === board.id
                                    ? 'bg-bg-selected text-monday-primary'
                                    : 'text-text-primary hover:text-text-primary'
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-5 h-5 rounded flex items-center justify-center text-white text-xs font-semibold flex-shrink-0',
                                    getBoardColor(board.color)
                                  )}
                                >
                                  {board.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="flex-1 truncate">{board.name}</span>
                                <button
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-bg-hover rounded transition-opacity flex-shrink-0"
                                  onClick={(e) => openMenu(e, board.id, board.name, board.color, false, false)}
                                >
                                  <MoreHorizontal className="w-4 h-4 text-text-tertiary" />
                                </button>
                              </Link>
                            ))}
                        </>
                      )}
                      {/* Archived boards section (toggle) */}
                      {boards.filter((b: any) => b.settings?.is_archived).length > 0 && (
                        <>
                          <button
                            onClick={() => setShowArchived(!showArchived)}
                            className="flex items-center gap-2 px-3 py-1 mt-2 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider hover:text-text-secondary w-full"
                          >
                            <Archive className="w-3 h-3" />
                            <span>Archived ({boards.filter((b: any) => b.settings?.is_archived).length})</span>
                            <ChevronDown className={cn('w-3 h-3 ml-auto transition-transform', !showArchived && '-rotate-90')} />
                          </button>
                          {showArchived && boards
                            .filter((b: any) => b.settings?.is_archived)
                            .map((board: any) => (
                              <Link
                                key={board.id}
                                href={`/boards/${board.id}`}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-fast group opacity-60',
                                  'hover:bg-bg-hover hover:opacity-100',
                                  currentBoardId === board.id
                                    ? 'bg-bg-selected text-monday-primary'
                                    : 'text-text-primary hover:text-text-primary'
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-5 h-5 rounded flex items-center justify-center text-white text-xs font-semibold flex-shrink-0',
                                    getBoardColor(board.color)
                                  )}
                                >
                                  {board.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="flex-1 truncate">{board.name}</span>
                                <button
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-bg-hover rounded transition-opacity flex-shrink-0"
                                  onClick={(e) => openMenu(e, board.id, board.name, board.color, board.settings?.is_favorite, true)}
                                >
                                  <MoreHorizontal className="w-4 h-4 text-text-tertiary" />
                                </button>
                              </Link>
                            ))}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-sm text-text-tertiary">
                      No boards yet
                    </div>
                  )}
                </div>

                {/* Add Board Button */}
                <Link
                  href="/boards?create=true"
                  className="flex items-center gap-3 px-3 py-2 mt-1 rounded-md text-sm font-medium text-text-primary hover:bg-bg-hover transition-all duration-fast"
                >
                  <Plus className="shrink-0 w-5 h-5" />
                  <span>Add Board</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Collapsed Boards Icon */}
        {collapsed && (
          <div className="px-2 py-1">
            <Link
              href="/boards"
              className={cn(
                'flex items-center justify-center p-2.5 rounded-md transition-all duration-fast',
                'hover:bg-bg-hover',
                pathname.startsWith('/boards')
                  ? 'bg-bg-selected text-monday-primary'
                  : 'text-text-primary'
              )}
              title="Boards"
            >
              <LayoutDashboard className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>

      {/* Collapse Button */}
      <div className="flex-shrink-0 border-t border-border-light p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-fast w-full',
            'hover:bg-bg-hover text-text-secondary hover:text-text-primary',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="truncate">ჩაკეცვა</span>
            </>
          )}
        </button>
      </div>
    </aside>

    {/* Board Actions Menu Portal */}
    {menuState && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[200px]"
          style={{
            top: menuState.position.top,
            left: menuState.position.left,
          }}
        >
          {/* Rename Mode */}
          {renameMode ? (
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') setRenameMode(false)
                  }}
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-monday-primary"
                  placeholder="Board name"
                />
                <button
                  onClick={handleRename}
                  disabled={actionLoading || !renameValue.trim()}
                  className="p-1.5 rounded hover:bg-gray-100 text-status-done disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRenameMode(false)}
                  className="p-1.5 rounded hover:bg-gray-100 text-text-tertiary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : showColorPicker ? (
            /* Color Picker */
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary">Choose color</span>
                <button
                  onClick={() => setShowColorPicker(false)}
                  className="p-1 rounded hover:bg-gray-100 text-text-tertiary"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleChangeColor(color.value)}
                    disabled={actionLoading}
                    className={cn(
                      'w-7 h-7 rounded-full transition-transform hover:scale-110',
                      color.class,
                      menuState.boardColor === color.value && 'ring-2 ring-offset-2 ring-monday-primary'
                    )}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          ) : showDeleteConfirm ? (
            /* Delete Confirmation */
            <div className="px-3 py-2">
              <p className="text-sm text-text-primary mb-3">
                Delete "{menuState.boardName}"? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex-1 px-3 py-1.5 bg-status-stuck text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-3 py-1.5 bg-gray-100 text-text-primary text-sm rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Main Menu */
            <>
              <button
                onClick={handleOpenInNewTab}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-text-tertiary" />
                Open in new tab
              </button>

              <button
                onClick={handleStartRename}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors"
              >
                <Pencil className="w-4 h-4 text-text-tertiary" />
                Rename
              </button>

              <button
                onClick={handleDuplicate}
                disabled={actionLoading}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Copy className="w-4 h-4 text-text-tertiary" />
                {actionLoading ? 'Duplicating...' : 'Duplicate'}
              </button>

              <button
                onClick={() => setShowColorPicker(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors"
              >
                <Palette className="w-4 h-4 text-text-tertiary" />
                Change color
              </button>

              <div className="my-1 border-t border-gray-100" />

              <button
                onClick={handleExport}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4 text-text-tertiary" />
                Export
              </button>

              <button
                onClick={handleToggleFavorite}
                disabled={actionLoading}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Star className={cn('w-4 h-4', menuState.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-text-tertiary')} />
                {menuState.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              </button>

              <div className="my-1 border-t border-gray-100" />

              <button
                onClick={handleArchive}
                disabled={actionLoading}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Archive className="w-4 h-4 text-text-tertiary" />
                {menuState.isArchived ? 'Unarchive' : 'Archive'}
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-status-stuck hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
