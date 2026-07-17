import { ListPageSkeleton } from '@/shared/components/ui'

export function CompaniesListSkeleton() {
  return (
    <ListPageSkeleton
      statCards={3}
      showSearch
      columnWidths={['w-40', 'w-48', 'w-32', 'w-20']}
      rows={10}
    />
  )
}
