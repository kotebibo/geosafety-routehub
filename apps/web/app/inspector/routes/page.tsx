'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, LoadingSpinner, StatCard, EmptyState } from '@/shared/components/ui'
import { Calendar, Clock, MapPin, Route as RouteIcon } from 'lucide-react'

interface Route {
  id: string
  name: string | null
  date: string
  start_time: string | null
  status: string | null
  stops: any[]
  total_distance_km: number | null
}

export default function InspectorRoutesPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const t = useTranslations()
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchRoutes()
    }
  }, [authLoading, user])

  const fetchRoutes = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('inspector_id', user.id)
        .order('scheduled_date', { ascending: true })

      if (error) throw error
      setRoutes((data || []) as unknown as Route[])
    } catch (error) {
      console.error('Error fetching routes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return <LoadingSpinner message={t('inspectorRoutes.loading')} />
  }

  const plannedRoutes = routes.filter(r => r.status === 'planned')
  const inProgressRoutes = routes.filter(r => r.status === 'in_progress')
  const completedRoutes = routes.filter(r => r.status === 'completed')

  return (
    <div className="min-h-screen bg-bg-secondary">
      <PageHeader
        title={t('inspectorRoutes.title')}
        description={t('inspectorRoutes.description')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={t('inspectorRoutes.totalRoutes')}
            value={routes.length}
            icon={RouteIcon}
            color="blue"
          />
          <StatCard
            label={t('inspectorRoutes.planned')}
            value={plannedRoutes.length}
            icon={Calendar}
            color="purple"
          />
          <StatCard
            label={t('inspectorRoutes.inProgress')}
            value={inProgressRoutes.length}
            icon={Clock}
            color="amber"
          />
          <StatCard
            label={t('inspectorRoutes.completed')}
            value={completedRoutes.length}
            icon={MapPin}
            color="green"
          />
        </div>

        {/* Routes List */}
        {routes.length === 0 ? (
          <EmptyState
            icon={<RouteIcon className="w-16 h-16" />}
            title={t('inspectorRoutes.emptyTitle')}
            description={t('inspectorRoutes.emptyDescription')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map(route => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RouteCard({ route }: { route: Route }) {
  const t = useTranslations()
  const statusColors = {
    planned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const statusLabels = {
    planned: t('inspectorRoutes.status.planned'),
    in_progress: t('inspectorRoutes.status.inProgress'),
    completed: t('inspectorRoutes.status.completed'),
    cancelled: t('inspectorRoutes.status.cancelled'),
  }

  return (
    <div className="bg-bg-primary rounded-lg border hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">{route.name}</h3>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[route.status as keyof typeof statusColors]}`}
        >
          {statusLabels[route.status as keyof typeof statusLabels]}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Calendar className="w-4 h-4" />
          <span>{new Date(route.date).toLocaleDateString('ka-GE')}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock className="w-4 h-4" />
          <span>{route.start_time}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <MapPin className="w-4 h-4" />
          <span>
            {route.stops?.length || 0} {t('inspectorRoutes.stops')}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <RouteIcon className="w-4 h-4" />
          <span>
            {route.total_distance_km?.toFixed(1) || '0.0'} {t('inspectorRoutes.km')}
          </span>
        </div>
      </div>

      <button className="mt-4 w-full px-4 py-2 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors">
        {t('inspectorRoutes.view')}
      </button>
    </div>
  )
}
