'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

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

      // If logged in and trying to access login page
      if (user && isPublicRoute) {
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

  // While auth is resolving, show a minimal spinner (NOT the full layout)
  // This is intentionally lightweight — the real LCP gains come from
  // the auth waterfall optimization and Sidebar lazy-load
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-text-secondary">იტვირთება...</p>
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
