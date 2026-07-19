import { Skeleton } from '@/shared/components/ui'

export function WorkspaceDetailSkeleton() {
  return (
    <div className="min-h-screen bg-bg-secondary p-8">
      <div className="max-w-7xl mx-auto">
        <Skeleton variant="bar" className="h-4 w-40 mb-6" />

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14" />
            <div className="space-y-2">
              <Skeleton variant="bar" className="h-7 w-48" />
              <Skeleton variant="bar" className="h-4 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>

        <Skeleton variant="bar" className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    </div>
  )
}
