import { Skeleton } from '@/shared/components/ui'

export function RouteBuilderSkeleton() {
  return (
    <div className="flex h-full">
      <div className="w-96 flex-shrink-0 border-r border-border-light bg-bg-primary p-4 space-y-3">
        <Skeleton variant="bar" className="h-5 w-32 mb-2" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
      <div className="flex-1 relative">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
    </div>
  )
}
