import { Skeleton } from '@/shared/components/ui/Skeleton'

export function BoardPageSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-secondary">
      {/* Skeleton Header */}
      <div className="flex-shrink-0 bg-bg-primary border-b border-border-light">
        <div className="w-full mx-auto px-4 md:px-6 py-4">
          {/* Top Bar Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="bar" className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          {/* Board Title Skeleton */}
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12" />
            <div>
              <Skeleton variant="bar" className="h-6 w-48 mb-2" />
              <Skeleton variant="bar" className="h-3 w-72" />
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton Toolbar */}
      <div className="flex-shrink-0 bg-bg-primary border-b border-border-light px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Skeleton Table */}
      <div className="flex-1 px-4 md:px-6 py-4">
        {/* Group Header */}
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton variant="bar" className="h-5 w-32" />
          <Skeleton variant="bar" className="h-4 w-16" />
        </div>

        {/* Table Header */}
        <div className="border border-border-light rounded-t-lg bg-bg-primary">
          <div className="flex items-center h-9 border-b border-border-light px-3 gap-4">
            <Skeleton variant="bar" className="h-3 w-4" />
            <Skeleton variant="bar" className="h-3 w-32" />
            <Skeleton variant="bar" className="h-3 w-24" />
            <Skeleton variant="bar" className="h-3 w-20" />
            <Skeleton variant="bar" className="h-3 w-28" />
            <Skeleton variant="bar" className="h-3 w-20" />
            <Skeleton variant="bar" className="h-3 w-24" />
          </div>

          {/* Table Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center h-9 border-b border-border-light px-3 gap-4">
              <Skeleton variant="bar" className="h-3 w-4" />
              <Skeleton
                variant="bar"
                className="h-3"
                style={{ width: `${120 + (i % 3) * 30}px` }}
              />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton variant="bar" className="h-3 w-20" />
              <Skeleton variant="bar" className="h-3 w-24" />
              <Skeleton variant="bar" className="h-3 w-16" />
              <Skeleton variant="bar" className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
