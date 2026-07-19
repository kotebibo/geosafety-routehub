import { Skeleton } from '@/shared/components/ui'

export default function ApiDocsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-4">
      <Skeleton variant="bar" className="h-8 w-64" />
      <Skeleton variant="bar" className="h-4 w-96" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
