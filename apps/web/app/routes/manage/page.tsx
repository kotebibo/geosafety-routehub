'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PageHeader, LoadingSpinner, StatCard, EmptyState } from '@/shared/components/ui'
import { ComponentErrorBoundary } from '@/shared/components/feedback'
import { RoutesTable } from '@/features/routes/components'
import { useRoutes } from '@/features/routes/hooks'
import { Route as RouteIcon, Calendar, CheckCircle, Plus } from 'lucide-react'

export default function RoutesManagePage() {
  const router = useRouter()
  const t = useTranslations()
  const { routes, inspectors, loading, error, deleteRoute, reassignRoute } = useRoutes()

  if (loading) {
    return <LoadingSpinner message={t('routes.manage.loading')} />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{t('routes.manage.errorOccurred')}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover"
          >
            {t('routes.manage.tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  const plannedRoutes = routes.filter(r => r.status === 'planned')
  const inProgressRoutes = routes.filter(r => r.status === 'in_progress')
  const completedRoutes = routes.filter(r => r.status === 'completed')

  return (
    <div className="min-h-screen bg-bg-secondary">
      <PageHeader
        title={t('routes.manage.pageTitle')}
        description={t('routes.manage.pageDescription')}
        action={{
          label: t('routes.manage.newRoute'),
          onClick: () => router.push('/routes/builder'),
          icon: <Plus className="w-5 h-5" />,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={t('routes.manage.statsTotalRoutes')}
            value={routes.length}
            icon={RouteIcon}
            color="blue"
          />
          <StatCard
            label={t('routes.manage.statsPlanned')}
            value={plannedRoutes.length}
            icon={Calendar}
            color="purple"
          />
          <StatCard
            label={t('routes.manage.statsInProgress')}
            value={inProgressRoutes.length}
            icon={RouteIcon}
            color="amber"
          />
          <StatCard
            label={t('routes.manage.statsCompleted')}
            value={completedRoutes.length}
            icon={CheckCircle}
            color="green"
          />
        </div>

        {/* Routes Table */}
        {routes.length === 0 ? (
          <EmptyState
            icon={<RouteIcon className="w-16 h-16" />}
            title={t('routes.manage.emptyTitle')}
            description={t('routes.manage.emptyDescription')}
            action={{
              label: t('routes.manage.newRoute'),
              onClick: () => router.push('/routes/builder'),
            }}
          />
        ) : (
          <ComponentErrorBoundary componentName="RoutesTable">
            <RoutesTable
              routes={routes}
              inspectors={inspectors}
              onDelete={deleteRoute}
              onReassign={reassignRoute}
            />
          </ComponentErrorBoundary>
        )}
      </div>
    </div>
  )
}
