import { Skeleton } from '@/shared/components/ui'

export function CompaniesPdpListSkeleton() {
  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-bg-primary border border-border-light rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton variant="bar" className="h-7 w-56" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-6 border border-border-light rounded-lg bg-bg-primary space-y-3"
            >
              <Skeleton variant="bar" className="h-4 w-24" />
              <Skeleton variant="bar" className="h-8 w-16" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border border-border-light rounded-lg bg-bg-primary flex items-center gap-4"
            >
              <div className="flex-1 space-y-2">
                <Skeleton variant="bar" className="h-4 w-48" />
                <Skeleton variant="bar" className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-20" />
              <Skeleton variant="bar" className="h-2 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
