'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { Header } from './Header'
import { cn } from '@/lib/utils'
import { Walkthrough, useWalkthrough } from '@/components/Walkthrough'
import { useAuth } from '@/contexts/AuthContext'

// Lazy-load the heavy Sidebar (1900 lines, imports @dnd-kit, fetches boards)
// This removes it from the critical render path, improving LCP
const Sidebar = dynamic(() => import('./Sidebar').then(m => ({ default: m.Sidebar })), {
  ssr: false,
  loading: () => (
    <div className="w-[260px] h-full bg-bg-primary border-r border-border-light animate-pulse" />
  ),
})

interface MondayLayoutProps {
  children: React.ReactNode
  className?: string
}

export function MondayLayout({ children, className }: MondayLayoutProps) {
  const { user } = useAuth()
  const { showWalkthrough, completeWalkthrough } = useWalkthrough()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-bg-secondary">
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar onMobileClose={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Fixed, doesn't scroll */}
        <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Page Content - This is the only part that can scroll */}
        <main className={cn('flex-1 overflow-auto', className)}>{children}</main>
      </div>

      {/* Walkthrough overlay - only for logged in users */}
      {user && showWalkthrough && <Walkthrough onComplete={completeWalkthrough} />}
    </div>
  )
}
