import { Skeleton } from '@/shared/components/ui'

export function LocationsMapSkeleton() {
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-bg-secondary">
      <div className="bg-bg-primary border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton variant="bar" className="h-7 w-56" />
            <Skeleton variant="bar" className="h-4 w-72" />
          </div>
          <Skeleton variant="bar" className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton variant="bar" className="h-3 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 relative">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
    </div>
  )
}
