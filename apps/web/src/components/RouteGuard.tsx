'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/shared/components/ui/Skeleton'

// Authentication is now enabled
const DISABLE_AUTH_FOR_DEV = false

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/reset-password', '/auth/callback']
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    // Skip auth checks in dev mode
    if (DISABLE_AUTH_FOR_DEV) return

    if (!loading) {
      // If not logged in and trying to access protected route
      if (!user && !isPublicRoute) {
        router.push(`/auth/login?from=${encodeURIComponent(pathname)}`)
      }

      // If logged in and trying to access login/signup page (but not reset-password)
      if (user && isPublicRoute && pathname !== '/auth/reset-password') {
        router.push('/')
      }
    }
  }, [user, loading, pathname, isPublicRoute, router])

  // Skip auth checks in dev mode
  if (DISABLE_AUTH_FOR_DEV) {
    return <>{children}</>
  }

  // On public routes (login, signup), render immediately — no auth needed
  if (isPublicRoute) {
    return <>{children}</>
  }

  // While auth is resolving, show a minimal neutral shell (NOT the full layout)
  // This is intentionally lightweight and page-agnostic — RouteGuard doesn't
  // know which page it's guarding yet. The real LCP gains come from the auth
  // waterfall optimization and Sidebar lazy-load.
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-secondary">
        <div className="h-14 border-b border-border-light bg-bg-primary flex items-center px-4 md:px-6">
          <Skeleton variant="bar" className="h-4 w-32" />
        </div>
        <div className="px-4 md:px-6 py-6 space-y-3">
          <Skeleton variant="bar" className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  // Redirect unauthenticated users (handled by useEffect above)
  if (!user) {
    return null
  }

  return <>{children}</>
}
