import { Skeleton } from '@/shared/components/ui'

export function WorkspacesListSkeleton() {
  return (
    <div className="min-h-screen bg-bg-secondary p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton variant="bar" className="h-8 w-48" />
            <Skeleton variant="bar" className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-lg border border-border-light bg-bg-primary overflow-hidden"
            >
              <Skeleton className="h-2 w-full rounded-none" />
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10" />
                  <Skeleton variant="bar" className="h-5 w-2/3" />
                </div>
                <Skeleton variant="bar" className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-bg-primary border border-border-light rounded-lg p-6 space-y-2"
            >
              <Skeleton variant="bar" className="h-8 w-12" />
              <Skeleton variant="bar" className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
