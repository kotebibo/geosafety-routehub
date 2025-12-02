'use client'

import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from '@/contexts/AuthContext'
import RouteGuard from '@/components/RouteGuard'
import { createQueryClient } from '@/lib/react-query'
import { ToastProvider } from '@/components/ui-monday/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  // Create query client once per app lifetime
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouteGuard>
            {children}
          </RouteGuard>
        </ToastProvider>
      </AuthProvider>
      {/* React Query Devtools - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
