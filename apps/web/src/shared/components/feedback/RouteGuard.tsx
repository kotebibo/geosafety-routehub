'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface RouteConfig {
  path: string;
  requiresAuth: boolean;
  allowedRoles?: string[];
  requiredPermission?: string;
}

// Route configurations
const ROUTE_CONFIGS: RouteConfig[] = [
  // Public routes
  { path: '/auth/login', requiresAuth: false },
  { path: '/auth/signup', requiresAuth: false },
  { path: '/auth/forgot-password', requiresAuth: false },

  // Admin routes - require admin role
  { path: '/admin', requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/admin/users', requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/admin/roles', requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/admin/service-types', requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/admin/setup-db', requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/admin/setup-pdp', requiresAuth: true, allowedRoles: ['admin'] },
  { path: '/admin/assignments', requiresAuth: true, allowedRoles: ['admin', 'dispatcher'] },

  // Inspector routes
  { path: '/inspector', requiresAuth: true, allowedRoles: ['admin', 'dispatcher', 'inspector'] },

  // General authenticated routes
  { path: '/', requiresAuth: true },
];

function matchRoute(pathname: string): RouteConfig | null {
  // Sort by specificity (longer paths first)
  const sorted = [...ROUTE_CONFIGS].sort((a, b) => b.path.length - a.path.length);

  for (const config of sorted) {
    if (pathname === config.path || pathname.startsWith(config.path + '/')) {
      return config;
    }
  }

  // Default: require authentication
  return { path: pathname, requiresAuth: true };
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userRole, loading, hasPermission } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Wait for auth to load
    if (loading) {
      setAuthorized(false);
      return;
    }

    const routeConfig = matchRoute(pathname);

    // Public route - always allow
    if (!routeConfig?.requiresAuth) {
      // If logged in and on auth page, redirect to home
      if (user && pathname.startsWith('/auth/')) {
        router.push('/');
        return;
      }
      setAuthorized(true);
      return;
    }

    // Protected route - check authentication
    if (!user) {
      router.push(`/auth/login?from=${encodeURIComponent(pathname)}`);
      setAuthorized(false);
      return;
    }

    // Check role-based access
    if (routeConfig.allowedRoles && routeConfig.allowedRoles.length > 0) {
      const userRoleName = userRole?.role;
      if (!userRoleName || !routeConfig.allowedRoles.includes(userRoleName)) {
        // Check if user has required permission instead
        if (routeConfig.requiredPermission && hasPermission(routeConfig.requiredPermission)) {
          setAuthorized(true);
          return;
        }

        // Redirect to home with error
        router.push('/?error=unauthorized');
        setAuthorized(false);
        return;
      }
    }

    // Check permission-based access
    if (routeConfig.requiredPermission && !hasPermission(routeConfig.requiredPermission)) {
      router.push('/?error=unauthorized');
      setAuthorized(false);
      return;
    }

    // User is authorized
    setAuthorized(true);
  }, [user, userRole, loading, pathname, router, hasPermission]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Export a hook for checking permissions in components
export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

// Export a component for conditional rendering based on permission
export function RequirePermission({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Export a component for conditional rendering based on role
export function RequireRole({
  roles,
  children,
  fallback = null,
}: {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { userRole } = useAuth();

  if (!userRole?.role || !roles.includes(userRole.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
