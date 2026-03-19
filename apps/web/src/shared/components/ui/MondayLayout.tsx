'use client'

import * as React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'
import { Walkthrough, useWalkthrough } from '@/components/Walkthrough'
import { useAuth } from '@/contexts/AuthContext'

interface MondayLayoutProps {
  children: React.ReactNode
  className?: string
}

export function MondayLayout({ children, className }: MondayLayoutProps) {
  const { user } = useAuth()
  const { showWalkthrough, completeWalkthrough } = useWalkthrough()

  return (
    <div className="flex h-screen overflow-hidden bg-bg-secondary">
      {/* Sidebar - Fixed, doesn't scroll */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Fixed, doesn't scroll */}
        <Header />

        {/* Page Content - This is the only part that can scroll */}
        <main className={cn('flex-1 overflow-auto', className)}>{children}</main>
      </div>

      {/* Walkthrough overlay - only for logged in users */}
      {user && showWalkthrough && <Walkthrough onComplete={completeWalkthrough} />}
    </div>
  )
}
