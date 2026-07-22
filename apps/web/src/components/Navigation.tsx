'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'
import {
  Home,
  Building2,
  Users,
  Route,
  MapIcon,
  LogOut,
  Shield,
  UserCog,
  MapPin,
  CalendarDays,
} from 'lucide-react'

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations()
  const { user, userRole, signOut, loading } = useAuth()

  // Don't show navigation on login page or while loading
  if (pathname === '/auth/login' || loading) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  const navItems = [
    { href: '/', label: t('nav.home'), icon: Home, roles: ['admin', 'dispatcher', 'officer'] },
    {
      href: '/companies',
      label: t('nav.companies'),
      icon: Building2,
      roles: ['admin', 'dispatcher'],
    },
    { href: '/inspectors', label: t('nav.officers'), icon: Users, roles: ['admin', 'dispatcher'] },
    {
      href: '/locations',
      label: t('navigation.locationsMap'),
      icon: MapPin,
      roles: ['admin', 'dispatcher'],
    },
    {
      href: '/admin/assignments',
      label: t('nav.assignments'),
      icon: UserCog,
      roles: ['admin', 'dispatcher'],
    },
    {
      href: '/routes/builder',
      label: t('nav.routeBuilder'),
      icon: MapIcon,
      roles: ['admin', 'dispatcher'],
    },
    {
      href: '/routes/manage',
      label: t('nav.routes'),
      icon: Route,
      roles: ['admin', 'dispatcher'],
    },
    { href: '/inspector/plan', label: t('nav.planWeek'), icon: CalendarDays, roles: ['officer'] },
    { href: '/inspector/routes', label: t('myWeek.title'), icon: Route, roles: ['officer'] },
  ]

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => !userRole || item.roles.includes(userRole.role))

  return (
    <nav className="bg-bg-primary border-b border-border-light sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Nav Items */}
          <div className="flex">
            <Link href="/" className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-text-primary">RouteHub</span>
            </Link>

            {user && (
              <div className="hidden md:ml-10 md:flex md:space-x-2">
                {filteredNavItems.map(item => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:block text-sm text-right">
                  <div className="font-medium text-text-primary">{user.email}</div>
                  {userRole && (
                    <div className="text-xs text-text-tertiary">
                      {userRole.role === 'admin' && `👑 ${t('role.admin')}`}
                      {userRole.role === 'dispatcher' && `📋 ${t('role.dispatcher')}`}
                      {userRole.role === 'officer' && `🔍 ${t('role.officer')}`}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3 py-2 border border-border-medium rounded-md text-sm font-medium text-text-secondary bg-bg-primary hover:bg-bg-hover transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('header.signOut')}
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                {t('home.signIn')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
