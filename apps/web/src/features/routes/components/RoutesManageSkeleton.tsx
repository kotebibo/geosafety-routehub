import { ListPageSkeleton } from '@/shared/components/ui'

export function RoutesManageSkeleton() {
  return (
    <ListPageSkeleton
      statCards={4}
      columnWidths={['w-32', 'w-28', 'w-32', 'w-24', 'w-20', 'w-16']}
      rows={8}
    />
  )
}
