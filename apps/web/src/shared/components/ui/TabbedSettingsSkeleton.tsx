import { Skeleton } from './Skeleton'

interface TabbedSettingsSkeletonProps {
  tabs?: number
  maxWidth?: string
}

export function TabbedSettingsSkeleton({
  tabs = 5,
  maxWidth = 'max-w-4xl',
}: TabbedSettingsSkeletonProps) {
  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="bg-bg-primary border-b border-border-light">
        <div className={`${maxWidth} mx-auto px-4 sm:px-8 py-6`}>
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-9 h-9" />
            <div className="space-y-2">
              <Skeleton variant="bar" className="h-6 w-40" />
              <Skeleton variant="bar" className="h-4 w-56" />
            </div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: tabs }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28" />
            ))}
          </div>
        </div>
      </div>

      <div className={`${maxWidth} mx-auto px-4 sm:px-8 py-8 space-y-6`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton variant="bar" className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
