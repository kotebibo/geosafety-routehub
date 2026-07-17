import { ListPageSkeleton } from '@/shared/components/ui'

export function ServiceTypesSkeleton() {
  return <ListPageSkeleton columnWidths={['w-40', 'w-32', 'w-48', 'w-24', 'w-20']} rows={8} />
}
