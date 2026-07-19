import { ListPageSkeleton } from '@/shared/components/ui'

export function InspectorsListSkeleton() {
  return <ListPageSkeleton statCards={3} columnWidths={['w-40', 'w-48', 'w-24', 'w-20']} rows={8} />
}
