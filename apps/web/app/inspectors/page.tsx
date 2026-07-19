'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PageHeader, StatCard, EmptyState } from '@/shared/components/ui'
import { InspectorTable } from '@/features/inspectors/components'
import { InspectorsListSkeleton } from '@/features/inspectors/components/InspectorsListSkeleton'
import { useInspectors } from '@/features/inspectors/hooks'
import { Users, UserCheck, UserX, Plus } from 'lucide-react'

export default function InspectorsPage() {
  const router = useRouter()
  const t = useTranslations()
  const { inspectors, loading, error, deleteInspector, updateInspectorStatus } = useInspectors()

  if (loading) {
    return <InspectorsListSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{t('inspectors.list.errorOccurred')}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover"
          >
            {t('inspectors.list.tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  const activeInspectors = inspectors.filter(i => i.status === 'active')
  const inactiveInspectors = inspectors.filter(i => i.status === 'inactive')

  return (
    <div className="min-h-screen bg-bg-secondary">
      <PageHeader
        title={t('inspectors.list.title')}
        description={t('inspectors.list.description')}
        action={{
          label: t('inspectors.list.newInspector'),
          onClick: () => router.push('/inspectors/new'),
          icon: <Plus className="w-5 h-5" />,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            label={t('inspectors.list.totalInspectors')}
            value={inspectors.length}
            icon={Users}
            color="blue"
          />
          <StatCard
            label={t('inspectors.list.active')}
            value={activeInspectors.length}
            icon={UserCheck}
            color="green"
          />
          <StatCard
            label={t('inspectors.list.inactive')}
            value={inactiveInspectors.length}
            icon={UserX}
            color="amber"
          />
        </div>

        {/* Inspectors Table */}
        {inspectors.length === 0 ? (
          <EmptyState
            icon={<Users className="w-16 h-16" />}
            title={t('inspectors.list.emptyTitle')}
            description={t('inspectors.list.emptyDescription')}
            action={{
              label: t('inspectors.list.newInspector'),
              onClick: () => router.push('/inspectors/new'),
            }}
          />
        ) : (
          <InspectorTable
            inspectors={inspectors}
            onDelete={deleteInspector}
            onToggleStatus={updateInspectorStatus}
          />
        )}
      </div>
    </div>
  )
}
