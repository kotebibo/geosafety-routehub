'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import { useUserBoards } from '@/features/boards/hooks'
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

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [boardsExpanded, setBoardsExpanded] = React.useState(true)
  const pathname = usePathname()
  const { user } = useAuth()
  const { data: inspectorId } = useInspectorId(user?.email)

  // Fetch user's boards
  const { data: boards, isLoading: boardsLoading } = useUserBoards(inspectorId || '')

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
      href: '/routes',
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
            {navItems.map((item) => {
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
                    boards.map((board) => (
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
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            // TODO: Show board options menu
                          }}
                        >
                          <MoreHorizontal className="w-4 h-4 text-text-tertiary" />
                        </button>
                      </Link>
                    ))
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
  )
}
