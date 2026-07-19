import { Skeleton } from '@/shared/components/ui'

export function NewsSkeleton() {
  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="bg-bg-primary border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-2">
          <Skeleton variant="bar" className="h-7 w-64" />
          <Skeleton variant="bar" className="h-4 w-96" />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-bg-primary rounded-xl border border-border-light p-5">
            <div className="flex items-start gap-4">
              <Skeleton className="w-10 h-10" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="bar" className="h-5 w-48" />
                <Skeleton variant="bar" className="h-4 w-full" />
                <Skeleton variant="bar" className="h-4 w-2/3" />
                <div className="flex gap-4 mt-3">
                  <Skeleton variant="bar" className="h-3 w-24" />
                  <Skeleton variant="bar" className="h-3 w-20" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
