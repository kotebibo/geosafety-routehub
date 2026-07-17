import { ListPageSkeleton } from '@/shared/components/ui'

export function CheckinsSkeleton() {
  return (
    <ListPageSkeleton
      showSearch
      columnWidths={['w-32', 'w-40', 'w-32', 'w-24', 'w-24', 'w-20']}
      rows={10}
    />
  )
}
