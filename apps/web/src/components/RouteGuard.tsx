'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/signup'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
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
