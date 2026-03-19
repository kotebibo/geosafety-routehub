'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
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
  LayoutDashboard,
  Globe,
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

interface NavItem {
  href: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const pathname = usePathname()
  const { language, setLanguage, t } = useLanguage()

  // Don't show sidebar on login page
  if (pathname === '/auth/login' || pathname === '/auth/register') {
    return null
  }

  const navItems: NavItem[] = [
    { href: '/', labelKey: 'nav.home', icon: Home, roles: ['admin', 'dispatcher', 'officer'] },
    {
      href: '/boards',
      labelKey: 'nav.boards',
      icon: LayoutDashboard,
      roles: ['admin', 'dispatcher'],
    },
    {
      href: '/companies',
      labelKey: 'nav.companies',
      icon: Building2,
      roles: ['admin', 'dispatcher'],
    },
    { href: '/inspectors', labelKey: 'nav.officers', icon: Users, roles: ['admin', 'dispatcher'] },
    { href: '/locations', labelKey: 'nav.locations', icon: MapPin, roles: ['admin', 'dispatcher'] },
    {
      href: '/routes',
      labelKey: 'nav.routes',
      icon: Route,
      roles: ['admin', 'dispatcher', 'officer'],
    },
    {
      href: '/routes/builder',
      labelKey: 'nav.routeBuilder',
      icon: MapIcon,
      roles: ['admin', 'dispatcher'],
    },
    {
      href: '/admin/assignments',
      labelKey: 'nav.assignments',
      icon: UserCog,
      roles: ['admin', 'dispatcher'],
    },
    {
      href: '/settings',
      labelKey: 'nav.settings',
      icon: Settings,
      roles: ['admin', 'dispatcher', 'officer'],
    },
  ]

  const toggleLanguage = () => {
    setLanguage(language === 'ka' ? 'en' : 'ka')
  }

  return (
    <aside
      className={cn(
        'flex-shrink-0 h-screen bg-bg-primary border-r border-border-light transition-all duration-normal sticky top-0',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center h-14 px-4 border-b border-border-light">
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-monday-primary rounded-md flex items-center justify-center text-white font-bold text-sm">
              RH
            </div>
            <span className="font-brand font-semibold text-lg text-text-primary">RouteHub</span>
          </Link>
        ) : (
          <Link href="/" className="flex items-center justify-center w-full">
            <div className="w-8 h-8 bg-monday-primary rounded-md flex items-center justify-center text-white font-bold text-sm">
              RH
            </div>
          </Link>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {navItems.map(item => {
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
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  <Icon className="shrink-0 w-5 h-5" />
                  {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border-light p-2 space-y-1">
        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-fast w-full',
            'hover:bg-bg-hover text-text-secondary hover:text-text-primary',
            collapsed && 'justify-center'
          )}
          title={collapsed ? (language === 'ka' ? 'English' : 'ქართული') : undefined}
        >
          <Globe className="w-5 h-5 shrink-0" />
          {!collapsed && (
            <span className="truncate">{language === 'ka' ? 'English' : 'ქართული'}</span>
          )}
        </button>

        {/* Collapse Button */}
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
              <span className="truncate">{t('nav.collapse')}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
