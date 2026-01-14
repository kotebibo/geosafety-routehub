'use client'

/**
 * Reusable page skeleton for loading states
 * Shows immediately while page content loads
 */

interface PageSkeletonProps {
  variant?: 'table' | 'board' | 'form' | 'default'
  showHeader?: boolean
  rows?: number
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className || ''}`}
      style={{ animationDuration: '1.5s' }}
    />
  )
}

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
        <SkeletonPulse className="h-4 w-32" />
        <SkeletonPulse className="h-4 w-24" />
        <SkeletonPulse className="h-4 w-28" />
        <SkeletonPulse className="h-4 w-20" />
        <SkeletonPulse className="h-4 w-24" />
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-gray-100">
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-4 w-28" />
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Board toolbar */}
      <div className="flex items-center gap-4 p-4 bg-white border-b">
        <SkeletonPulse className="h-8 w-48" />
        <div className="flex-1" />
        <SkeletonPulse className="h-8 w-24" />
        <SkeletonPulse className="h-8 w-24" />
      </div>
      {/* Board groups */}
      {[1, 2].map((group) => (
        <div key={group} className="bg-white rounded-lg border">
          {/* Group header */}
          <div className="flex items-center gap-3 p-3 border-b bg-gray-50">
            <SkeletonPulse className="h-5 w-5 rounded" />
            <SkeletonPulse className="h-5 w-32" />
            <SkeletonPulse className="h-4 w-16 ml-2" />
          </div>
          {/* Column headers */}
          <div className="flex gap-2 p-3 border-b bg-gray-50/50">
            <SkeletonPulse className="h-4 w-48" />
            <SkeletonPulse className="h-4 w-24" />
            <SkeletonPulse className="h-4 w-20" />
            <SkeletonPulse className="h-4 w-28" />
            <SkeletonPulse className="h-4 w-24" />
          </div>
          {/* Rows */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-2 p-3 border-b border-gray-100">
              <SkeletonPulse className="h-4 w-48" />
              <SkeletonPulse className="h-6 w-24 rounded-full" />
              <SkeletonPulse className="h-4 w-20" />
              <SkeletonPulse className="h-4 w-28" />
              <SkeletonPulse className="h-4 w-24" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <SkeletonPulse className="h-10 w-24 rounded-lg" />
        <SkeletonPulse className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  )
}

function DefaultSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonPulse className="h-8 w-64" />
      <SkeletonPulse className="h-4 w-96" />
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 border rounded-lg">
            <SkeletonPulse className="h-6 w-20 mb-4" />
            <SkeletonPulse className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PageSkeleton({
  variant = 'default',
  showHeader = true,
  rows = 8
}: PageSkeletonProps) {
  return (
    <div className="p-6">
      {showHeader && (
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonPulse className="h-8 w-48" />
            <SkeletonPulse className="h-4 w-64" />
          </div>
          <SkeletonPulse className="h-10 w-32 rounded-lg" />
        </div>
      )}

      {variant === 'table' && <TableSkeleton rows={rows} />}
      {variant === 'board' && <BoardSkeleton />}
      {variant === 'form' && <FormSkeleton />}
      {variant === 'default' && <DefaultSkeleton />}
    </div>
  )
}
