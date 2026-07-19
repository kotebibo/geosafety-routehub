import { Skeleton } from '@/shared/components/ui'

export function PanelMapSkeleton() {
  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-border-light bg-bg-primary p-4 space-y-3">
        <Skeleton variant="bar" className="h-5 w-32 mb-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8" />
            <div className="flex-1 space-y-1">
              <Skeleton variant="bar" className="h-3 w-24" />
              <Skeleton variant="bar" className="h-2 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 relative">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
    </div>
  )
}
