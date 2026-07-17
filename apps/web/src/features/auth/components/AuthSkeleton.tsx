import { Skeleton } from '@/shared/components/ui'

export function AuthSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-end">
          <Skeleton variant="bar" className="h-4 w-20" />
        </div>

        <div className="text-center space-y-4">
          <Skeleton className="w-16 h-16 mx-auto" />
          <Skeleton variant="bar" className="h-8 w-40 mx-auto" />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton variant="bar" className="h-4 w-16" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton variant="bar" className="h-4 w-20" />
            <Skeleton className="h-11 w-full" />
          </div>
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  )
}
