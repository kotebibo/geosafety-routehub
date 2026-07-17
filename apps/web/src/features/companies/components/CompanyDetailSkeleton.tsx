import { Skeleton } from '@/shared/components/ui'

export function CompanyDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Skeleton variant="bar" className="h-5 w-20 mb-6" />
      <div className="flex items-start gap-6 mb-8">
        <Skeleton className="w-14 h-14" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="bar" className="h-7 w-64" />
          <Skeleton variant="bar" className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64 mb-6" />
      <Skeleton className="h-48" />
    </div>
  )
}
