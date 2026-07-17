import { Skeleton } from '@/shared/components/ui'

export function AssignmentsSkeleton() {
  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="bg-bg-primary border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-2">
          <Skeleton variant="bar" className="h-7 w-56" />
          <Skeleton variant="bar" className="h-4 w-80" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-6 border border-border-light rounded-lg bg-bg-primary space-y-3"
            >
              <Skeleton className="h-10 w-10" />
              <Skeleton variant="bar" className="h-4 w-20" />
              <Skeleton variant="bar" className="h-6 w-16" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex gap-4 p-4 bg-bg-secondary rounded-lg">
              <Skeleton variant="bar" className="h-4 w-32" />
              <Skeleton variant="bar" className="h-4 w-24" />
              <Skeleton variant="bar" className="h-4 w-28" />
              <Skeleton variant="bar" className="h-4 w-20" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border-b border-border-light">
                <Skeleton variant="bar" className="h-4 w-32" />
                <Skeleton variant="bar" className="h-4 w-24" />
                <Skeleton variant="bar" className="h-4 w-28" />
                <Skeleton variant="bar" className="h-4 w-20" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-1 space-y-3 p-4 border border-border-light rounded-lg bg-bg-primary">
            <Skeleton variant="bar" className="h-5 w-32 mb-2" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8" />
                <div className="flex-1 space-y-1">
                  <Skeleton variant="bar" className="h-3 w-24" />
                  <Skeleton variant="bar" className="h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
