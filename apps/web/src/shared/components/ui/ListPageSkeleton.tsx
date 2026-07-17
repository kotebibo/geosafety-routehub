import { Skeleton } from './Skeleton'

interface ListPageSkeletonProps {
  statCards?: number
  showSearch?: boolean
  columnWidths?: string[]
  rows?: number
}

export function ListPageSkeleton({
  statCards = 0,
  showSearch = false,
  columnWidths = ['w-32', 'w-24', 'w-28', 'w-20'],
  rows = 8,
}: ListPageSkeletonProps) {
  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* PageHeader */}
      <div className="bg-bg-primary border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton variant="bar" className="h-7 w-48" />
            <Skeleton variant="bar" className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {statCards > 0 && (
          <div
            className="grid grid-cols-1 gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(statCards, 4)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: statCards }).map((_, i) => (
              <div
                key={i}
                className="p-6 border border-border-light rounded-lg bg-bg-primary space-y-3"
              >
                <Skeleton className="h-10 w-10" />
                <Skeleton variant="bar" className="h-4 w-20" />
                <Skeleton variant="bar" className="h-6 w-16" />
              </div>
            ))}
          </div>
        )}

        {showSearch && <Skeleton className="h-12 w-full" />}

        <div className="space-y-3">
          <div className="flex gap-4 p-4 bg-bg-secondary rounded-lg">
            {columnWidths.map((w, i) => (
              <Skeleton key={i} variant="bar" className={`h-4 ${w}`} />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-border-light">
              {columnWidths.map((w, j) => (
                <Skeleton key={j} variant="bar" className={`h-4 ${w}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
