'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// TODO: Re-enable authentication before deployment
const DISABLE_AUTH_FOR_DEV = true;

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/signup'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    // Skip auth checks in dev mode
    if (DISABLE_AUTH_FOR_DEV) return;

    if (!loading) {
      // If not logged in and trying to access protected route
      if (!user && !isPublicRoute) {
        router.push(`/auth/login?from=${encodeURIComponent(pathname)}`);
      }

      // If logged in and trying to access login page
      if (user && isPublicRoute) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, isPublicRoute, router]);

  // Skip auth checks in dev mode
  if (DISABLE_AUTH_FOR_DEV) {
    return <>{children}</>;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-600">იტვირთება...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}
