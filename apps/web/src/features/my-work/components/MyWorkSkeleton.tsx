import { Skeleton } from '@/shared/components/ui'

export function MyWorkSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8" />
        <Skeleton variant="bar" className="h-7 w-40" />
      </div>

      {Array.from({ length: 3 }).map((_, groupIdx) => (
        <div key={groupIdx} className="space-y-3">
          <Skeleton variant="bar" className="h-4 w-24" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 border border-border-light rounded-lg bg-bg-primary"
            >
              <Skeleton className="w-5 h-5" />
              <div className="flex-1 space-y-1">
                <Skeleton variant="bar" className="h-4 w-1/2" />
                <Skeleton variant="bar" className="h-3 w-1/3" />
              </div>
              <Skeleton variant="bar" className="h-3 w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
