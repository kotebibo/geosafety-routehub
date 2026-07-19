import { Skeleton } from '@/shared/components/ui'

export function InspectorTrackingSkeleton() {
  return (
    <div className="min-h-screen bg-bg-secondary py-6">
      <div className="text-center mb-6 space-y-2">
        <Skeleton variant="bar" className="h-6 w-40 mx-auto" />
        <Skeleton variant="bar" className="h-4 w-56 mx-auto" />
      </div>
      <div className="max-w-lg mx-auto px-4 space-y-4">
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    </div>
  )
}
