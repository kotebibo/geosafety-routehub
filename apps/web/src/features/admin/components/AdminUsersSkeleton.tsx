import { ListPageSkeleton } from '@/shared/components/ui'

export function AdminUsersSkeleton() {
  return (
    <ListPageSkeleton
      statCards={4}
      showSearch
      columnWidths={['w-40', 'w-48', 'w-24', 'w-24', 'w-20']}
      rows={8}
    />
  )
}
