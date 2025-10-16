'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import RouteGuard from '@/components/RouteGuard'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RouteGuard>
        {children}
      </RouteGuard>
    </AuthProvider>
  );
}
