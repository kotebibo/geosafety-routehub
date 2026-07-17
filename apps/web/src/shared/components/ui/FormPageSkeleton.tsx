import { Skeleton } from './Skeleton'

interface FormPageSkeletonProps {
  fields?: number
  showBackButton?: boolean
}

export function FormPageSkeleton({ fields = 6, showBackButton = true }: FormPageSkeletonProps) {
  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-4">
          {showBackButton && <Skeleton className="w-9 h-9" />}
          <Skeleton variant="bar" className="h-7 w-56" />
        </div>

        <div className="bg-bg-primary border border-border-light rounded-lg p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton variant="bar" className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}
