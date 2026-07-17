import { Skeleton } from '@/shared/components/ui'

export function PaymentsListSkeleton() {
  return (
    <div className="p-6 space-y-5 max-w-[1500px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="bar" className="h-7 w-40" />
          <Skeleton variant="bar" className="h-4 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-16" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-6 border border-border-light rounded-lg bg-bg-primary space-y-3"
          >
            <Skeleton variant="bar" className="h-4 w-20" />
            <Skeleton variant="bar" className="h-6 w-24" />
          </div>
        ))}
      </div>

      <Skeleton className="h-12 w-full" />

      <div className="space-y-3">
        <div className="flex gap-4 p-4 bg-bg-secondary rounded-lg">
          <Skeleton variant="bar" className="h-4 w-32" />
          <Skeleton variant="bar" className="h-4 w-40" />
          <Skeleton variant="bar" className="h-4 w-24" />
          <Skeleton variant="bar" className="h-4 w-24" />
          <Skeleton variant="bar" className="h-4 w-20" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b border-border-light">
            <Skeleton variant="bar" className="h-4 w-32" />
            <Skeleton variant="bar" className="h-4 w-40" />
            <Skeleton variant="bar" className="h-4 w-24" />
            <Skeleton variant="bar" className="h-4 w-24" />
            <Skeleton variant="bar" className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
