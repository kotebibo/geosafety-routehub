import { Skeleton } from '@/shared/components/ui'

export function UnmatchedPaymentsSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto pb-24">
      <div className="flex items-center gap-4">
        <Skeleton className="w-9 h-9" />
        <div className="space-y-2">
          <Skeleton variant="bar" className="h-7 w-56" />
          <Skeleton variant="bar" className="h-4 w-40" />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-bg-primary rounded-lg border border-border-light p-4 flex items-center gap-4"
          >
            <div className="flex-1 space-y-2">
              <Skeleton variant="bar" className="h-4 w-40" />
              <Skeleton variant="bar" className="h-3 w-56" />
            </div>
            <div className="text-right space-y-2">
              <Skeleton variant="bar" className="h-4 w-24" />
              <Skeleton variant="bar" className="h-3 w-20" />
            </div>
            <Skeleton className="w-8 h-8" />
          </div>
        ))}
      </div>
    </div>
  )
}
