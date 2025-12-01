'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  Search,
  Bell,
  HelpCircle,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react'

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userRole, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  // Don't show header on login page
  if (pathname === '/auth/login' || pathname === '/auth/register') {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  // Get breadcrumb from pathname
  const getBreadcrumb = () => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 0) return 'მთავარი'

    const breadcrumbMap: Record<string, string> = {
      companies: 'კომპანიები',
      inspectors: 'ინსპექტორები',
      locations: 'ლოკაციები',
      routes: 'მარშრუტები',
      builder: 'მარშრუტის შექმნა',
      manage: 'მართვა',
      admin: 'ადმინისტრაცია',
      assignments: 'დანიშვნები',
      inspector: 'ინსპექტორი',
      settings: 'პარამეტრები',
      boards: 'დაფები',
    }

    return segments.map((seg) => breadcrumbMap[seg] || seg).join(' / ')
  }

  const getRoleBadge = () => {
    if (!userRole) return null

    const roleMap: Record<string, { label: string; color: string }> = {
      admin: { label: 'ადმინისტრატორი', color: 'bg-[var(--color-purple)] text-white' },
      dispatcher: { label: 'დისპეტჩერი', color: 'bg-[var(--color-bright-blue)] text-white' },
      inspector: { label: 'ინსპექტორი', color: 'bg-[var(--color-grass-green)] text-white' },
    }

    const role = roleMap[userRole.role]
    if (!role) return null

    return (
      <span
        className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium',
          role.color
        )}
      >
        {role.label}
      </span>
    )
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-14 bg-bg-primary border-b border-border-light',
        className
      )}
    >
      <div className="flex items-center justify-between h-full px-4 gap-4">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-text-primary truncate">
            {getBreadcrumb()}
          </h1>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="ძებნა..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-md text-sm',
                'bg-bg-secondary border border-border-light',
                'text-text-primary placeholder:text-text-tertiary',
                'focus:outline-none focus:ring-2 focus:ring-monday-primary focus:border-transparent',
                'transition-all duration-fast'
              )}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Help Button */}
          <button
            className={cn(
              'p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover',
              'transition-all duration-fast'
            )}
            title="დახმარება"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button
            className={cn(
              'relative p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover',
              'transition-all duration-fast'
            )}
            title="შეტყობინებები"
          >
            <Bell className="w-5 h-5" />
            {/* Notification badge */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-stuck rounded-full" />
          </button>

          {/* User Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md',
                  'text-text-primary hover:bg-bg-hover',
                  'transition-all duration-fast'
                )}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-monday-primary flex items-center justify-center text-white text-sm font-medium">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {user.email?.split('@')[0]}
                  </span>
                  {getRoleBadge()}
                </div>
                <ChevronDown className="w-4 h-4 text-text-tertiary" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />

                  {/* Menu */}
                  <div className="absolute right-0 top-full mt-2 w-64 bg-bg-primary rounded-lg shadow-monday-lg border border-border-light z-50">
                    {/* User Info */}
                    <div className="p-4 border-b border-border-light">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-monday-primary flex items-center justify-center text-white font-medium">
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">
                            {user.email}
                          </div>
                          {getRoleBadge()}
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          router.push('/settings')
                          setShowUserMenu(false)
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-text-primary hover:bg-bg-hover transition-all duration-fast"
                      >
                        <User className="w-4 h-4" />
                        <span>პროფილი</span>
                      </button>

                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-status-stuck hover:bg-bg-hover transition-all duration-fast"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>გასვლა</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
