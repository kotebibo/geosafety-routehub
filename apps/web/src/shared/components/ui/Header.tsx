'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { LogOut, User, ChevronDown, Search, Menu } from 'lucide-react'
import { GlobalSearchModal } from '@/features/boards/components/GlobalSearch'

interface HeaderProps {
  className?: string
  onMenuToggle?: () => void
}

export function Header({ className, onMenuToggle }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userRole, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const { t } = useLanguage()

  // Detect Mac for keyboard shortcut display
  const [isMac, setIsMac] = React.useState(false)
  React.useEffect(() => {
    setIsMac(
      navigator.platform?.toUpperCase().includes('MAC') || navigator.userAgent?.includes('Mac')
    )
  }, [])

  // Global search keyboard shortcut (Ctrl+K / Cmd+K)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
    if (segments.length === 0) return t('breadcrumb.home')

    return segments
      .map(seg => {
        const key = `breadcrumb.${seg}`
        const translated = t(key)
        return translated !== key ? translated : seg
      })
      .join(' / ')
  }

  const getRoleBadge = () => {
    if (!userRole) return null

    const roleMap: Record<string, { labelKey: string; color: string }> = {
      admin: { labelKey: 'role.admin', color: 'bg-[var(--color-purple)] text-white' },
      dispatcher: {
        labelKey: 'role.dispatcher',
        color: 'bg-[var(--color-bright-blue)] text-white',
      },
      officer: { labelKey: 'role.officer', color: 'bg-[var(--color-grass-green)] text-white' },
    }

    const role = roleMap[userRole.role]
    if (!role) return null

    return (
      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', role.color)}>
        {t(role.labelKey)}
      </span>
    )
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30 h-14 bg-bg-primary border-b border-border-light',
          className
        )}
      >
        <div className="flex items-center justify-between h-full px-4 gap-4">
          {/* Left: Hamburger + Breadcrumb */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden p-1.5 rounded-md hover:bg-bg-hover text-text-primary transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-lg font-semibold text-text-primary truncate">{getBreadcrumb()}</h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                'border border-[#c3c6d4] bg-[#f0f1f3] hover:bg-[#e6e7ea]',
                'text-[#555766] text-sm transition-colors',
                'min-w-0 sm:min-w-[200px] lg:min-w-[280px]'
              )}
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:block flex-1 text-left">{t('common.search')}</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-bg-primary border border-[#c3c6d4] text-[10px] text-[#676879] font-mono">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </kbd>
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
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />

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
                          <span>{t('header.profile')}</span>
                        </button>

                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-status-stuck hover:bg-bg-hover transition-all duration-fast"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{t('header.signOut')}</span>
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

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
