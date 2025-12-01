'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
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

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const pathname = usePathname()

  // Don't show sidebar on login page
  if (pathname === '/auth/login' || pathname === '/auth/register') {
    return null
  }

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'მთავარი',
      labelEn: 'Home',
      icon: Home,
      roles: ['admin', 'dispatcher', 'inspector'],
    },
    {
      href: '/boards',
      label: 'დაფები',
      labelEn: 'Boards',
      icon: LayoutDashboard,
      roles: ['admin', 'dispatcher'],
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

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
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
                    <Icon className={cn('shrink-0', collapsed ? 'w-5 h-5' : 'w-5 h-5')} />
                    {!collapsed && (
                      <span className="truncate">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Collapse Button */}
        <div className="border-t border-border-light p-2">
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
