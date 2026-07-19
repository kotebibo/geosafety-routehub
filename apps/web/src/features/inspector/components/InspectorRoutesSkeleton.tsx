import { ListPageSkeleton } from '@/shared/components/ui'

export function InspectorRoutesSkeleton() {
  return <ListPageSkeleton statCards={4} columnWidths={['w-32', 'w-28', 'w-24', 'w-20']} rows={6} />
}
