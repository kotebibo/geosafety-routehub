import { Skeleton } from '@/shared/components/ui'

export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-bg-primary to-bg-tertiary">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-4">
          <Skeleton variant="bar" className="h-14 w-2/3 mx-auto" />
          <Skeleton variant="bar" className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-10 w-64 mx-auto rounded-full" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <Skeleton variant="bar" className="h-7 w-48 mx-auto mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-primary rounded-2xl shadow-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="w-14 h-14" />
                <Skeleton className="w-6 h-6" />
              </div>
              <Skeleton variant="bar" className="h-5 w-2/3" />
              <Skeleton variant="bar" className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
