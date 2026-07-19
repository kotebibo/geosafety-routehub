import { Skeleton } from '@/shared/components/ui/Skeleton'

export function ChatSkeleton() {
  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <div className="border-b border-border-light bg-bg-primary px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="h-9 w-9" />
          <div>
            <Skeleton variant="bar" className="h-4 w-32 mb-2" />
            <Skeleton variant="bar" className="h-3 w-48" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex gap-3">
            <Skeleton variant="circle" className="h-7 w-7 shrink-0" />
            <Skeleton className="h-12 w-2/3 rounded-xl" />
          </div>
          <div className="flex gap-3 justify-end">
            <Skeleton className="h-10 w-1/2 rounded-xl" />
            <Skeleton variant="circle" className="h-7 w-7 shrink-0" />
          </div>
          <div className="flex gap-3">
            <Skeleton variant="circle" className="h-7 w-7 shrink-0" />
            <Skeleton className="h-16 w-3/4 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="border-t border-border-light bg-bg-primary px-6 py-4">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
