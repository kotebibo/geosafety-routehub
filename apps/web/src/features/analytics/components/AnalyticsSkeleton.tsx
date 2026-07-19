import { Skeleton } from '@/shared/components/ui'

export function AnalyticsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 space-y-2">
        <Skeleton variant="bar" className="h-7 w-48" />
        <Skeleton variant="bar" className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <div className="mt-8 flex gap-2 border-b border-border-light pb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[400px]" />
        ))}
      </div>
    </div>
  )
}
