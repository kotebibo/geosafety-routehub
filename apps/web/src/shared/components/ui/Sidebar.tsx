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
import { CreateWorkspaceModal } from '@/features/workspaces/components'
import { useWorkspaces, useDeleteWorkspace, useUpdateWorkspace } from '@/features/workspaces/hooks'
import { WORKSPACE_ROLE_PERMISSIONS } from '@/types/workspace'
import {
  Home,
  Building2,
  Users,
  Route,
  MapIcon,
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
  BarChart3,
  Navigation,
  Megaphone,
  MapPinned,
  Globe,
  Search,
} from 'lucide-react'
import { NotificationBell } from '@/shared/components/notifications'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useLanguage } from '@/contexts/LanguageContext'
import { Tooltip } from '@/shared/components/ui/tooltip'

interface SidebarProps {
  className?: string
  onMobileClose?: () => void
}

interface NavItem {
  href: string
  label: string
  labelEn: string
  icon: React.ComponentType<{ className?: string }>
  permission: string
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

// Workspace type for menu state
interface WorkspaceMenuState {
  workspaceId: string
  workspaceName: string
  canEditSettings: boolean
  canDelete: boolean
  position: { top: number; left: number }
}

export function Sidebar({ className, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('routehub-sidebar-collapsed') === 'true'
    }
    return false
  })
  const [showArchived, setShowArchived] = React.useState(false)
  const [menuState, setMenuState] = React.useState<BoardMenuState | null>(null)
  const [showColorPicker, setShowColorPicker] = React.useState(false)
  const [renameMode, setRenameMode] = React.useState(false)
  const [renameValue, setRenameValue] = React.useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [showCreateWorkspace, setShowCreateWorkspace] = React.useState(false)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = React.useState<string | null>(null)
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = React.useState(false)
  // Workspace menu state
  const [workspaceMenuState, setWorkspaceMenuState] = React.useState<WorkspaceMenuState | null>(
    null
  )
  const [workspaceRenameMode, setWorkspaceRenameMode] = React.useState(false)
  const [workspaceRenameValue, setWorkspaceRenameValue] = React.useState('')
  const [workspaceDeleteConfirm, setWorkspaceDeleteConfirm] = React.useState(false)
  const [boardSearchQuery, setBoardSearchQuery] = React.useState('')
  const [boardSearchOpen, setBoardSearchOpen] = React.useState(false)
  const [boardSearchIndex, setBoardSearchIndex] = React.useState(0)
  const boardSearchRef = React.useRef<HTMLDivElement>(null)
  const boardSearchInputRef = React.useRef<HTMLInputElement>(null)

  // Persist collapsed state
  React.useEffect(() => {
    localStorage.setItem('routehub-sidebar-collapsed', String(collapsed))
  }, [collapsed])

  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, userRole, loading: authLoading, hasPermission } = useAuth()
  const { data: inspectorId } = useInspectorId(user?.email)

  // Use auth user ID for board queries - RLS policies filter by auth.uid()
  // This ensures boards show up even if user doesn't have an inspector record
  const userId = user?.id || ''

  const { unreadCount: unreadNews } = useAnnouncements()
  const { language, setLanguage, t } = useLanguage()

  const menuRef = React.useRef<HTMLDivElement>(null)
  const renameInputRef = React.useRef<HTMLInputElement>(null)
  const workspaceMenuRef = React.useRef<HTMLDivElement>(null)
  const workspaceRenameInputRef = React.useRef<HTMLInputElement>(null)

  // Only fetch data after auth is complete to avoid race condition
  // where query fires before JWT token is available
  const isAuthReady = !authLoading && !!user

  // Fetch all workspaces
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces(isAuthReady)

  // Fetch all user's boards (using auth user ID, not inspector ID)
  const { data: allBoards, isLoading: allBoardsLoading } = useUserBoards(isAuthReady ? userId : '')

  // Build workspace context from boards (includes workspaces where user is board-only member)
  // and group boards by workspace
  const { boardsByWorkspace, sharedBoards, allWorkspaceContexts } = React.useMemo(() => {
    if (!allBoards)
      return {
        boardsByWorkspace: new Map(),
        sharedBoards: [] as any[],
        allWorkspaceContexts: new Map(),
      }

    // Build workspace context from board data (Approach D — embedded workspace info)
    const wsContextMap = new Map<
      string,
      { id: string; name: string; icon: string; color: string }
    >()

    allBoards.forEach((board: any) => {
      if (board.workspace_id && board.workspace && !wsContextMap.has(board.workspace_id)) {
        wsContextMap.set(board.workspace_id, board.workspace)
      }
    })

    // Merge full workspace data (workspace members get richer data)
    if (workspaces) {
      workspaces.forEach((ws: any) => {
        wsContextMap.set(ws.id, ws) // Full workspace data overrides board-embedded data
      })
    }

    // Group boards by workspace
    const grouped = new Map<string, typeof allBoards>()
    const shared: typeof allBoards = []

    wsContextMap.forEach((_, wsId) => grouped.set(wsId, []))

    allBoards.forEach((board: any) => {
      const wsId = board.workspace_id
      if (wsId && grouped.has(wsId)) {
        grouped.get(wsId)!.push(board)
      } else {
        shared.push(board)
      }
    })

    return { boardsByWorkspace: grouped, sharedBoards: shared, allWorkspaceContexts: wsContextMap }
  }, [allBoards, workspaces])

  // Check if user is a full workspace member (vs board-only access)
  const isWorkspaceMember = React.useCallback(
    (wsId: string) => {
      return workspaces?.some((ws: any) => ws.id === wsId && ws.current_user_role) ?? false
    },
    [workspaces]
  )

  // Auto-select workspace based on current board or default
  React.useEffect(() => {
    if (allWorkspaceContexts.size === 0 && sharedBoards.length === 0) return

    // If viewing a board, select its workspace
    if (pathname.startsWith('/boards/') && allBoards) {
      const boardId = pathname.split('/')[2]
      const board = allBoards.find((b: any) => b.id === boardId)
      if (board) {
        const wsId = board.workspace_id
        if (wsId && allWorkspaceContexts.has(wsId)) {
          setSelectedWorkspaceId(wsId)
          return
        } else {
          setSelectedWorkspaceId('__shared__')
          return
        }
      }
    }

    // If no workspace selected yet, pick first
    if (!selectedWorkspaceId) {
      const firstWsId = allWorkspaceContexts.keys().next().value
      setSelectedWorkspaceId(firstWsId || null)
    }
  }, [pathname, allBoards, allWorkspaceContexts, sharedBoards])

  const workspaceDropdownRef = React.useRef<HTMLDivElement>(null)

  // Close workspace dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        workspaceDropdownRef.current &&
        !workspaceDropdownRef.current.contains(event.target as Node)
      ) {
        setWorkspaceDropdownOpen(false)
      }
    }
    if (workspaceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [workspaceDropdownOpen])

  // Get boards for the currently selected workspace
  const selectedWorkspaceBoards = React.useMemo(() => {
    if (selectedWorkspaceId === '__shared__') return sharedBoards
    if (selectedWorkspaceId) return boardsByWorkspace.get(selectedWorkspaceId) || []
    return []
  }, [selectedWorkspaceId, boardsByWorkspace, sharedBoards])

  const selectedWorkspace = selectedWorkspaceId
    ? allWorkspaceContexts.get(selectedWorkspaceId)
    : null

  // For backwards compatibility - set current workspace when creating board
  const getCurrentWorkspaceId = () => {
    if (selectedWorkspaceId && selectedWorkspaceId !== '__shared__') {
      return selectedWorkspaceId
    }
    return workspaces?.[0]?.id || null
  }

  // Legacy references for boards (for menu actions)
  const boards = allBoards
  const boardsLoading = allBoardsLoading

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

  // Close workspace menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        closeWorkspaceMenu()
      }
    }

    if (workspaceMenuState) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [workspaceMenuState])

  // Focus workspace rename input when entering rename mode
  React.useEffect(() => {
    if (workspaceRenameMode && workspaceRenameInputRef.current) {
      workspaceRenameInputRef.current.focus()
      workspaceRenameInputRef.current.select()
    }
  }, [workspaceRenameMode])

  // Focus rename input when entering rename mode
  React.useEffect(() => {
    if (renameMode && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renameMode])

  // Board search
  const boardSearchResults = React.useMemo(() => {
    if (!boardSearchQuery.trim() || !allBoards) return []
    const q = boardSearchQuery.toLowerCase()
    return allBoards.filter((b: any) => b.name.toLowerCase().includes(q)).slice(0, 8)
  }, [boardSearchQuery, allBoards])

  React.useEffect(() => {
    setBoardSearchIndex(0)
  }, [boardSearchResults.length])

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (boardSearchRef.current && !boardSearchRef.current.contains(e.target as Node)) {
        setBoardSearchOpen(false)
        setBoardSearchQuery('')
      }
    }
    if (boardSearchOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [boardSearchOpen])

  const handleBoardSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setBoardSearchOpen(false)
      setBoardSearchQuery('')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setBoardSearchIndex(i => Math.min(i + 1, boardSearchResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setBoardSearchIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && boardSearchResults[boardSearchIndex]) {
      e.preventDefault()
      router.push(`/boards/${boardSearchResults[boardSearchIndex].id}`)
      setBoardSearchOpen(false)
      setBoardSearchQuery('')
    }
  }

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

  // Workspace menu functions
  const openWorkspaceMenu = (
    e: React.MouseEvent,
    workspaceId: string,
    workspaceName: string,
    workspaceRole?: string
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = (e.target as HTMLElement).getBoundingClientRect()
    // Use workspace-level role to determine permissions
    // App-level admins get owner permissions
    const isAppAdmin = userRole?.role === 'admin'
    const effectiveRole = isAppAdmin ? 'owner' : workspaceRole || 'guest'
    const perms =
      WORKSPACE_ROLE_PERMISSIONS[effectiveRole as keyof typeof WORKSPACE_ROLE_PERMISSIONS]
    setWorkspaceMenuState({
      workspaceId,
      workspaceName,
      canEditSettings: perms.canEditSettings,
      canDelete: perms.canDelete,
      position: {
        top: rect.top,
        left: rect.right + 8,
      },
    })
    setWorkspaceRenameValue(workspaceName)
  }

  const closeWorkspaceMenu = () => {
    setWorkspaceMenuState(null)
    setWorkspaceRenameMode(false)
    setWorkspaceDeleteConfirm(false)
  }

  const refreshBoards = () => {
    // Invalidate all user-boards queries - the key is ['routes', 'user-boards', ...]
    queryClient.invalidateQueries({ queryKey: ['routes', 'user-boards'] })
    // Also refresh workspaces
    queryClient.invalidateQueries({ queryKey: ['workspaces'] })
  }

  const handleWorkspaceChange = (workspaceId: string) => {
    // Select the new workspace in the sidebar
    setSelectedWorkspaceId(workspaceId)
    // Navigate to the workspace detail page
    router.push(`/workspaces/${workspaceId}`)
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
        settings: { ...board.settings, is_favorite: !menuState.isFavorite },
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
        settings: { ...board.settings, is_archived: !menuState.isArchived },
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
      permission: 'pages:dashboard',
    },
    {
      href: '/news',
      label: 'სიახლეები',
      labelEn: 'News',
      icon: Megaphone,
      permission: 'pages:news',
    },
    {
      href: '/analytics',
      label: 'ფინანსური ანალიტიკა',
      labelEn: 'Financial Analytics',
      icon: BarChart3,
      permission: 'pages:analytics',
    },
    {
      href: '/tracking',
      label: 'ტრეკინგი',
      labelEn: 'Live Tracking',
      icon: Navigation,
      permission: 'pages:tracking',
    },
    {
      href: '/inspector/checkin',
      label: 'ჩეკ-ინი',
      labelEn: 'Check-in',
      icon: MapPinned,
      permission: 'pages:checkin',
    },
    {
      href: '/admin/checkins',
      label: 'ჩეკ-ინები',
      labelEn: 'Check-ins',
      icon: MapPinned,
      permission: 'pages:checkins_admin',
    },
    {
      href: '/companies',
      label: 'კომპანიები',
      labelEn: 'Companies',
      icon: Building2,
      permission: 'pages:companies',
    },
    {
      href: '/inspectors',
      label: 'ოფიცრები',
      labelEn: 'Officers',
      icon: Users,
      permission: 'pages:officers',
    },
    {
      href: '/routes/manage',
      label: 'მარშრუტები',
      labelEn: 'Routes',
      icon: Route,
      permission: 'pages:routes',
    },
    {
      href: '/routes/builder',
      label: 'მარშრუტის შექმნა',
      labelEn: 'Route Builder',
      icon: MapIcon,
      permission: 'pages:route_builder',
    },
    {
      href: '/admin/assignments',
      label: 'დანიშვნები',
      labelEn: 'Assignments',
      icon: UserCog,
      permission: 'pages:assignments',
    },
    {
      href: '/admin/users',
      label: 'მომხმარებლები',
      labelEn: 'User Management',
      icon: Shield,
      permission: 'pages:user_management',
    },
    {
      href: '/admin/roles',
      label: 'როლები',
      labelEn: 'Roles & Permissions',
      icon: KeyRound,
      permission: 'pages:roles',
    },
    {
      href: '/settings',
      label: 'პარამეტრები',
      labelEn: 'Settings',
      icon: Settings,
      permission: 'pages:settings',
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
        <div className="flex-shrink-0 flex items-center gap-2 h-14 px-3 border-b border-border-light">
          {!collapsed ? (
            <>
              <Link
                href="/"
                className="flex items-center gap-2 flex-1 min-w-0"
                onClick={onMobileClose}
              >
                <div className="w-8 h-8 bg-monday-primary rounded-md flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  RH
                </div>
                <span className="text-lg font-semibold text-text-primary truncate">RouteHub</span>
              </Link>
              <NotificationBell />
              {onMobileClose && (
                <button
                  onClick={onMobileClose}
                  className="lg:hidden p-1.5 rounded-md hover:bg-bg-hover text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Link href="/" className="flex items-center justify-center">
                <div className="w-8 h-8 bg-monday-primary rounded-md flex items-center justify-center text-white font-bold text-sm">
                  RH
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-thin">
          {/* Main Navigation - Top Section */}
          <div className="flex-shrink-0">
            {/* Primary Navigation */}
            <nav className="py-4 px-2" data-walkthrough="sidebar">
              <ul className="space-y-1">
                {navItems
                  .filter(item => hasPermission(item.permission))
                  .map(item => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const badge = item.href === '/news' && unreadNews > 0 ? unreadNews : 0

                    const label = language === 'en' ? item.labelEn : item.label

                    const link = (
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
                        data-walkthrough={
                          item.href === '/boards'
                            ? 'boards'
                            : item.href === '/companies'
                              ? 'companies'
                              : item.href === '/routes/manage'
                                ? 'routes'
                                : undefined
                        }
                      >
                        <Icon className="shrink-0 w-5 h-5" />
                        {!collapsed && (
                          <>
                            <span className="truncate flex-1">{label}</span>
                            {badge > 0 && (
                              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-semibold text-white bg-red-500 rounded-full">
                                {badge > 99 ? '99+' : badge}
                              </span>
                            )}
                          </>
                        )}
                        {collapsed && badge > 0 && (
                          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </Link>
                    )

                    return (
                      <li key={item.href}>
                        {collapsed ? (
                          <Tooltip content={label} side="right">
                            {link}
                          </Tooltip>
                        ) : (
                          link
                        )}
                      </li>
                    )
                  })}
              </ul>
            </nav>
          </div>

          {/* Boards Section */}
          <div className="flex-1 flex flex-col min-h-0">
            {!collapsed ? (
              <div className="flex flex-col h-full px-2">
                {/* Board Search */}
                <div className="mb-2 relative" ref={boardSearchRef}>
                  <div
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-colors',
                      boardSearchOpen
                        ? 'border-monday-primary bg-bg-primary'
                        : 'border-border-light bg-bg-secondary hover:border-border-medium'
                    )}
                  >
                    <Search className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                    <input
                      ref={boardSearchInputRef}
                      type="text"
                      value={boardSearchQuery}
                      onChange={e => {
                        setBoardSearchQuery(e.target.value)
                        if (!boardSearchOpen) setBoardSearchOpen(true)
                      }}
                      onFocus={() => setBoardSearchOpen(true)}
                      onKeyDown={handleBoardSearchKeyDown}
                      placeholder="ბორდის ძიება..."
                      className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary outline-none min-w-0"
                    />
                    {boardSearchQuery && (
                      <button
                        onClick={() => {
                          setBoardSearchQuery('')
                          boardSearchInputRef.current?.focus()
                        }}
                        className="text-text-tertiary hover:text-text-secondary"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {boardSearchOpen && boardSearchQuery.trim() && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-bg-primary rounded-lg border border-border-light shadow-lg overflow-hidden">
                      {boardSearchResults.length === 0 ? (
                        <div className="px-3 py-3 text-[13px] text-text-tertiary text-center">
                          ბორდი ვერ მოიძებნა
                        </div>
                      ) : (
                        <div className="py-1 max-h-[240px] overflow-y-auto">
                          {boardSearchResults.map((board: any, i: number) => (
                            <Link
                              key={board.id}
                              href={`/boards/${board.id}`}
                              onClick={() => {
                                setBoardSearchOpen(false)
                                setBoardSearchQuery('')
                              }}
                              onMouseEnter={() => setBoardSearchIndex(i)}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors',
                                i === boardSearchIndex
                                  ? 'bg-bg-selected text-monday-primary'
                                  : 'text-text-primary hover:bg-bg-hover'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-2.5 h-2.5 rounded-sm flex-shrink-0',
                                  getBoardColor(board.color)
                                )}
                              />
                              <span className="flex-1 truncate">{board.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Workspace Dropdown Selector */}
                {workspacesLoading || boardsLoading ? (
                  <div className="px-3 py-2 text-sm text-text-tertiary">Loading...</div>
                ) : allWorkspaceContexts.size > 0 || (workspaces && workspaces.length > 0) ? (
                  <>
                    <div className="mb-1 relative" ref={workspaceDropdownRef}>
                      <button
                        onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                        className={cn(
                          'flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-sm transition-all',
                          'hover:bg-bg-hover text-text-primary border border-border-medium bg-bg-primary',
                          workspaceDropdownOpen && 'border-monday-primary bg-bg-hover shadow-sm'
                        )}
                      >
                        {selectedWorkspaceId === '__shared__' ? (
                          <Users className="w-4 h-4 flex-shrink-0 text-text-tertiary" />
                        ) : (
                          <div className="w-5 h-5 rounded bg-monday-primary flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {(selectedWorkspace?.name || 'W').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="flex-1 truncate text-left font-medium text-[13px]">
                          {selectedWorkspaceId === '__shared__'
                            ? 'Shared with me'
                            : selectedWorkspace?.name || 'Select workspace'}
                        </span>
                        <ChevronDown
                          className={cn(
                            'w-3.5 h-3.5 text-text-tertiary transition-transform flex-shrink-0',
                            workspaceDropdownOpen && 'rotate-180'
                          )}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {workspaceDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-bg-primary rounded-lg border border-monday-primary shadow-lg py-1 max-h-[280px] overflow-y-auto">
                          {Array.from(allWorkspaceContexts.entries()).map(([wsId, ws]) => {
                            const boardCount = (boardsByWorkspace.get(wsId) || []).filter(
                              (b: any) => !b.settings?.is_archived
                            ).length
                            const isMember = isWorkspaceMember(wsId)
                            const fullWs = workspaces?.find((w: any) => w.id === wsId)
                            return (
                              <button
                                key={wsId}
                                onClick={() => {
                                  setSelectedWorkspaceId(wsId)
                                  setWorkspaceDropdownOpen(false)
                                }}
                                className={cn(
                                  'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                                  'hover:bg-bg-hover',
                                  selectedWorkspaceId === wsId &&
                                    'bg-bg-selected text-monday-primary'
                                )}
                              >
                                <div className="w-5 h-5 rounded bg-monday-primary flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                  {(ws.name || 'W').charAt(0).toUpperCase()}
                                </div>
                                <span className="flex-1 truncate text-left">{ws.name}</span>
                                <span className="text-xs text-text-tertiary flex-shrink-0">
                                  {boardCount}
                                </span>
                                {isMember && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    className="p-0.5 hover:bg-bg-hover rounded transition-opacity flex-shrink-0"
                                    onClick={e => {
                                      e.stopPropagation()
                                      setWorkspaceDropdownOpen(false)
                                      openWorkspaceMenu(e, wsId, ws.name, fullWs?.current_user_role)
                                    }}
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5 text-text-tertiary" />
                                  </span>
                                )}
                              </button>
                            )
                          })}

                          {/* Shared with me option */}
                          {sharedBoards.length > 0 && (
                            <>
                              <div className="my-1 border-t border-border-light" />
                              <button
                                onClick={() => {
                                  setSelectedWorkspaceId('__shared__')
                                  setWorkspaceDropdownOpen(false)
                                }}
                                className={cn(
                                  'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                                  'hover:bg-bg-hover',
                                  selectedWorkspaceId === '__shared__' &&
                                    'bg-bg-selected text-monday-primary'
                                )}
                              >
                                <Users className="w-4 h-4 flex-shrink-0 text-text-tertiary" />
                                <span className="flex-1 truncate text-left">Shared with me</span>
                                <span className="text-xs text-text-tertiary flex-shrink-0">
                                  {sharedBoards.filter((b: any) => !b.settings?.is_archived).length}
                                </span>
                              </button>
                            </>
                          )}

                          {/* New workspace option */}
                          <div className="my-1 border-t border-border-light" />
                          <button
                            onClick={() => {
                              setWorkspaceDropdownOpen(false)
                              setShowCreateWorkspace(true)
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            <span>New workspace</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Flat Board List for Selected Workspace */}
                    <div className="pl-2 ml-1 border-l border-border-light">
                      {(() => {
                        const activeBoards = selectedWorkspaceBoards.filter(
                          (b: any) => !b.settings?.is_archived
                        )
                        const archivedBoards = selectedWorkspaceBoards.filter(
                          (b: any) => b.settings?.is_archived
                        )

                        return (
                          <div className="space-y-0.5">
                            {activeBoards.length > 0 ? (
                              activeBoards.map((board: any) => (
                                <Link
                                  key={board.id}
                                  href={`/boards/${board.id}`}
                                  className={cn(
                                    'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-all group',
                                    'hover:bg-bg-hover',
                                    currentBoardId === board.id
                                      ? 'bg-bg-selected text-monday-primary'
                                      : 'text-text-primary'
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0',
                                      getBoardColor(board.color)
                                    )}
                                  >
                                    {board.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="flex-1 truncate">{board.name}</span>
                                  {board.settings?.is_favorite && (
                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                  )}
                                  <button
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-bg-hover rounded transition-opacity flex-shrink-0"
                                    onClick={e =>
                                      openMenu(
                                        e,
                                        board.id,
                                        board.name,
                                        board.color,
                                        board.settings?.is_favorite,
                                        false
                                      )
                                    }
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5 text-text-tertiary" />
                                  </button>
                                </Link>
                              ))
                            ) : (
                              <div className="px-2.5 py-3 text-xs text-text-tertiary text-center">
                                No boards in this workspace
                              </div>
                            )}

                            {/* Archived boards toggle */}
                            {archivedBoards.length > 0 && (
                              <>
                                <button
                                  onClick={() => setShowArchived(!showArchived)}
                                  className="flex items-center gap-2 px-2.5 py-1 mt-1 text-xs text-text-tertiary hover:text-text-secondary w-full"
                                >
                                  <Archive className="w-3 h-3" />
                                  <span>Archived ({archivedBoards.length})</span>
                                  <ChevronDown
                                    className={cn(
                                      'w-3 h-3 ml-auto transition-transform',
                                      !showArchived && '-rotate-90'
                                    )}
                                  />
                                </button>
                                {showArchived &&
                                  archivedBoards.map((board: any) => (
                                    <Link
                                      key={board.id}
                                      href={`/boards/${board.id}`}
                                      className={cn(
                                        'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-all group opacity-50',
                                        'hover:bg-bg-hover hover:opacity-100',
                                        currentBoardId === board.id
                                          ? 'bg-bg-selected text-monday-primary'
                                          : 'text-text-primary'
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          'w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0',
                                          getBoardColor(board.color)
                                        )}
                                      >
                                        {board.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="flex-1 truncate">{board.name}</span>
                                      <button
                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-bg-hover rounded transition-opacity flex-shrink-0"
                                        onClick={e =>
                                          openMenu(
                                            e,
                                            board.id,
                                            board.name,
                                            board.color,
                                            board.settings?.is_favorite,
                                            true
                                          )
                                        }
                                      >
                                        <MoreHorizontal className="w-3.5 h-3.5 text-text-tertiary" />
                                      </button>
                                    </Link>
                                  ))}
                              </>
                            )}

                            {/* Add Board button */}
                            {selectedWorkspaceId && selectedWorkspaceId !== '__shared__' && (
                              <Link
                                href={`/boards?create=true&workspace=${selectedWorkspaceId}`}
                                className="flex items-center gap-2 px-2.5 py-1.5 mt-0.5 rounded-md text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add board</span>
                              </Link>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-2 text-sm text-text-tertiary">
                    <p className="mb-2">No workspaces yet</p>
                    <button
                      onClick={() => setShowCreateWorkspace(true)}
                      className="flex items-center gap-2 text-monday-primary hover:underline"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create workspace</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Collapsed Boards - search icon + workspace initial + board avatars */
              <div className="px-2 py-1 space-y-1">
                {/* Search icon */}
                <div className="relative" ref={boardSearchRef}>
                  <Tooltip content="ბორდის ძიება" side="right">
                    <button
                      onClick={() => {
                        setBoardSearchOpen(!boardSearchOpen)
                        setTimeout(() => boardSearchInputRef.current?.focus(), 0)
                      }}
                      className={cn(
                        'flex items-center justify-center w-full py-1.5 rounded-md transition-all',
                        'hover:bg-bg-hover text-text-secondary hover:text-text-primary'
                      )}
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </Tooltip>

                  {boardSearchOpen && (
                    <div className="absolute left-full top-0 ml-2 z-50 w-64 bg-bg-primary rounded-lg border border-border-light shadow-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-light">
                        <Search className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                        <input
                          ref={boardSearchInputRef}
                          type="text"
                          value={boardSearchQuery}
                          onChange={e => setBoardSearchQuery(e.target.value)}
                          onKeyDown={handleBoardSearchKeyDown}
                          placeholder="ბორდის ძიება..."
                          className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary outline-none"
                        />
                        {boardSearchQuery && (
                          <button
                            onClick={() => setBoardSearchQuery('')}
                            className="text-text-tertiary hover:text-text-secondary"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {boardSearchQuery.trim() &&
                        (boardSearchResults.length === 0 ? (
                          <div className="px-3 py-3 text-[13px] text-text-tertiary text-center">
                            ბორდი ვერ მოიძებნა
                          </div>
                        ) : (
                          <div className="py-1 max-h-[240px] overflow-y-auto">
                            {boardSearchResults.map((board: any, i: number) => (
                              <Link
                                key={board.id}
                                href={`/boards/${board.id}`}
                                onClick={() => {
                                  setBoardSearchOpen(false)
                                  setBoardSearchQuery('')
                                }}
                                onMouseEnter={() => setBoardSearchIndex(i)}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors',
                                  i === boardSearchIndex
                                    ? 'bg-bg-selected text-monday-primary'
                                    : 'text-text-primary hover:bg-bg-hover'
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-2.5 h-2.5 rounded-sm flex-shrink-0',
                                    getBoardColor(board.color)
                                  )}
                                />
                                <span className="flex-1 truncate">{board.name}</span>
                              </Link>
                            ))}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Workspace initial */}
                {selectedWorkspace && (
                  <Tooltip content={selectedWorkspace.name} side="right">
                    <div className="flex items-center justify-center py-1">
                      <div className="w-7 h-7 rounded bg-monday-primary flex items-center justify-center text-white text-[11px] font-bold">
                        {selectedWorkspace.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </Tooltip>
                )}

                {/* Divider */}
                <div className="border-t border-border-light mx-1" />

                {/* Board avatars */}
                {(() => {
                  const activeBoards = selectedWorkspaceBoards.filter(
                    (b: any) => !b.settings?.is_archived
                  )
                  return activeBoards.length > 0 ? (
                    activeBoards.map((board: any) => (
                      <Tooltip key={board.id} content={board.name} side="right">
                        <Link
                          href={`/boards/${board.id}`}
                          className={cn(
                            'flex items-center justify-center p-1.5 rounded-md transition-all duration-fast relative group',
                            'hover:bg-bg-hover',
                            currentBoardId === board.id &&
                              'bg-bg-selected ring-2 ring-monday-primary/30'
                          )}
                        >
                          <div
                            className={cn(
                              'w-7 h-7 rounded flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0',
                              getBoardColor(board.color)
                            )}
                          >
                            {board.name.charAt(0).toUpperCase()}
                          </div>
                          {board.settings?.is_favorite && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-400 rounded-full border border-white" />
                          )}
                        </Link>
                      </Tooltip>
                    ))
                  ) : (
                    <Tooltip content="Boards" side="right">
                      <Link
                        href="/boards"
                        className={cn(
                          'flex items-center justify-center p-2.5 rounded-md transition-all duration-fast',
                          'hover:bg-bg-hover text-text-tertiary'
                        )}
                      >
                        <LayoutDashboard className="w-5 h-5" />
                      </Link>
                    </Tooltip>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
        {/* End scrollable content area */}

        {/* Bottom Section */}
        <div className="flex-shrink-0 border-t border-border-light p-2 space-y-1">
          {/* Language Toggle */}
          {(() => {
            const langLabel = language === 'ka' ? 'English' : 'ქართული'
            const langBtn = (
              <button
                onClick={() => setLanguage(language === 'ka' ? 'en' : 'ka')}
                data-walkthrough="language-toggle"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-fast w-full',
                  'hover:bg-bg-hover text-text-secondary hover:text-text-primary',
                  collapsed && 'justify-center'
                )}
              >
                <Globe className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{langLabel}</span>}
              </button>
            )
            return collapsed ? (
              <Tooltip content={langLabel} side="right">
                {langBtn}
              </Tooltip>
            ) : (
              langBtn
            )
          })()}

          {/* Collapse Button */}
          {(() => {
            const collapseLabel = collapsed ? t('nav.expand') : t('nav.collapse')
            const collapseBtn = (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-fast w-full',
                  'hover:bg-bg-hover text-text-secondary hover:text-text-primary',
                  collapsed && 'justify-center'
                )}
              >
                {collapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <>
                    <ChevronLeft className="w-5 h-5" />
                    <span className="truncate">{collapseLabel}</span>
                  </>
                )}
              </button>
            )
            return collapsed ? (
              <Tooltip content={collapseLabel} side="right">
                {collapseBtn}
              </Tooltip>
            ) : (
              collapseBtn
            )
          })()}
        </div>
      </aside>

      {/* Board Actions Menu Portal */}
      {menuState &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] bg-bg-primary rounded-lg border border-border-light shadow-lg py-1 min-w-[200px]"
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
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename()
                      if (e.key === 'Escape') setRenameMode(false)
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-border-light rounded focus:outline-none focus:border-monday-primary"
                    placeholder="Board name"
                  />
                  <button
                    onClick={handleRename}
                    disabled={actionLoading || !renameValue.trim()}
                    className="p-1.5 rounded hover:bg-bg-hover text-status-done disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRenameMode(false)}
                    className="p-1.5 rounded hover:bg-bg-hover text-text-tertiary"
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
                    className="p-1 rounded hover:bg-bg-hover text-text-tertiary"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(color => (
                    <Tooltip
                      key={color.value}
                      content={color.label}
                      side="bottom"
                      delayDuration={200}
                    >
                      <button
                        onClick={() => handleChangeColor(color.value)}
                        disabled={actionLoading}
                        className={cn(
                          'w-7 h-7 rounded-full transition-transform hover:scale-110',
                          color.class,
                          menuState.boardColor === color.value &&
                            'ring-2 ring-offset-2 ring-monday-primary'
                        )}
                      />
                    </Tooltip>
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
                    className="flex-1 px-3 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded hover:bg-bg-hover"
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
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-text-tertiary" />
                  Open in new tab
                </button>

                <button
                  onClick={handleStartRename}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <Pencil className="w-4 h-4 text-text-tertiary" />
                  Rename
                </button>

                <button
                  onClick={handleDuplicate}
                  disabled={actionLoading}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
                >
                  <Copy className="w-4 h-4 text-text-tertiary" />
                  {actionLoading ? 'Duplicating...' : 'Duplicate'}
                </button>

                <button
                  onClick={() => setShowColorPicker(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <Palette className="w-4 h-4 text-text-tertiary" />
                  Change color
                </button>

                <div className="my-1 border-t border-border-light" />

                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <Download className="w-4 h-4 text-text-tertiary" />
                  Export
                </button>

                <button
                  onClick={handleToggleFavorite}
                  disabled={actionLoading}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
                >
                  <Star
                    className={cn(
                      'w-4 h-4',
                      menuState.isFavorite
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-text-tertiary'
                    )}
                  />
                  {menuState.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                </button>

                <div className="my-1 border-t border-border-light" />

                <button
                  onClick={handleArchive}
                  disabled={actionLoading}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50"
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

      {/* Workspace Actions Menu Portal */}
      {workspaceMenuState &&
        typeof document !== 'undefined' &&
        createPortal(
          <WorkspaceActionsMenu
            menuRef={workspaceMenuRef}
            menuState={workspaceMenuState}
            renameMode={workspaceRenameMode}
            renameValue={workspaceRenameValue}
            deleteConfirm={workspaceDeleteConfirm}
            actionLoading={actionLoading}
            renameInputRef={workspaceRenameInputRef}
            onRenameValueChange={setWorkspaceRenameValue}
            onStartRename={() => setWorkspaceRenameMode(true)}
            onCancelRename={() => setWorkspaceRenameMode(false)}
            onShowDeleteConfirm={() => setWorkspaceDeleteConfirm(true)}
            onCancelDelete={() => setWorkspaceDeleteConfirm(false)}
            onClose={closeWorkspaceMenu}
            onRefresh={refreshBoards}
            setActionLoading={setActionLoading}
            router={router}
          />,
          document.body
        )}

      {/* Create Workspace Modal */}
      {inspectorId && (
        <CreateWorkspaceModal
          isOpen={showCreateWorkspace}
          onClose={() => setShowCreateWorkspace(false)}
          userId={inspectorId}
          onSuccess={workspaceId => {
            handleWorkspaceChange(workspaceId)
            refreshBoards()
          }}
        />
      )}
    </>
  )
}

// Workspace Actions Menu Component
interface WorkspaceActionsMenuProps {
  menuRef: React.RefObject<HTMLDivElement>
  menuState: WorkspaceMenuState
  renameMode: boolean
  renameValue: string
  deleteConfirm: boolean
  actionLoading: boolean
  renameInputRef: React.RefObject<HTMLInputElement>
  onRenameValueChange: (value: string) => void
  onStartRename: () => void
  onCancelRename: () => void
  onShowDeleteConfirm: () => void
  onCancelDelete: () => void
  onClose: () => void
  onRefresh: () => void
  setActionLoading: (loading: boolean) => void
  router: ReturnType<typeof useRouter>
}

function WorkspaceActionsMenu({
  menuRef,
  menuState,
  renameMode,
  renameValue,
  deleteConfirm,
  actionLoading,
  renameInputRef,
  onRenameValueChange,
  onStartRename,
  onCancelRename,
  onShowDeleteConfirm,
  onCancelDelete,
  onClose,
  onRefresh,
  setActionLoading,
  router,
}: WorkspaceActionsMenuProps) {
  const updateMutation = useUpdateWorkspace(menuState.workspaceId)
  const deleteMutation = useDeleteWorkspace()

  const handleOpenInNewTab = () => {
    window.open(`/workspaces/${menuState.workspaceId}`, '_blank')
    onClose()
  }

  const handleRename = async () => {
    if (!renameValue.trim() || actionLoading) return

    setActionLoading(true)
    try {
      await updateMutation.mutateAsync({ name: renameValue.trim() })
      onRefresh()
      onClose()
    } catch (error) {
      console.error('Error renaming workspace:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (actionLoading) return

    setActionLoading(true)
    try {
      await deleteMutation.mutateAsync(menuState.workspaceId)
      onRefresh()
      onClose()
    } catch (error) {
      console.error('Error deleting workspace:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleGoToSettings = () => {
    router.push(`/workspaces/${menuState.workspaceId}/settings`)
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-bg-primary rounded-lg border border-border-light shadow-lg py-1 min-w-[200px]"
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
              onChange={e => onRenameValueChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') onCancelRename()
              }}
              className="flex-1 px-2 py-1 text-sm border border-border-light rounded focus:outline-none focus:border-monday-primary"
              placeholder="Workspace name"
            />
            <button
              onClick={handleRename}
              disabled={actionLoading || !renameValue.trim()}
              className="p-1.5 rounded hover:bg-bg-hover text-status-done disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={onCancelRename}
              className="p-1.5 rounded hover:bg-bg-hover text-text-tertiary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : deleteConfirm ? (
        /* Delete Confirmation */
        <div className="px-3 py-2">
          <p className="text-sm text-text-primary mb-3">
            Delete "{menuState.workspaceName}"? All boards in this workspace will be permanently
            deleted.
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
              onClick={onCancelDelete}
              className="flex-1 px-3 py-1.5 bg-bg-tertiary text-text-primary text-sm rounded hover:bg-bg-hover"
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
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-text-tertiary" />
            Open in new tab
          </button>

          {menuState.canEditSettings && (
            <button
              onClick={onStartRename}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
            >
              <Pencil className="w-4 h-4 text-text-tertiary" />
              Rename
            </button>
          )}

          <button
            onClick={handleGoToSettings}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
          >
            <Settings className="w-4 h-4 text-text-tertiary" />
            Settings
          </button>

          {menuState.canDelete && (
            <>
              <div className="my-1 border-t border-border-light" />
              <button
                onClick={onShowDeleteConfirm}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-status-stuck hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
