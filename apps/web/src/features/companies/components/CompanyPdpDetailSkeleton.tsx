import { Skeleton } from '@/shared/components/ui'

export function CompanyPdpDetailSkeleton() {
  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="bg-bg-primary border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Skeleton variant="bar" className="h-5 w-32" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-bg-primary rounded-lg shadow p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="w-12 h-12" />
                <div className="space-y-1">
                  <Skeleton variant="bar" className="h-5 w-32" />
                  <Skeleton variant="bar" className="h-3 w-24" />
                </div>
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-5 h-5" />
                  <div className="flex-1 space-y-1">
                    <Skeleton variant="bar" className="h-3 w-20" />
                    <Skeleton variant="bar" className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    </div>
  )
}
