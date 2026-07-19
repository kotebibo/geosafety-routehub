import { Skeleton } from '@/shared/components/ui'

export function RolesSkeleton() {
  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-9 h-9" />
          <div className="space-y-2">
            <Skeleton variant="bar" className="h-7 w-48" />
            <Skeleton variant="bar" className="h-4 w-64" />
          </div>
        </div>

        <Skeleton className="h-11 w-full" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border border-border-light rounded-lg bg-bg-primary flex items-center gap-3"
            >
              <Skeleton className="w-10 h-10" />
              <div className="flex-1 space-y-1">
                <Skeleton variant="bar" className="h-4 w-32" />
                <Skeleton variant="bar" className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
