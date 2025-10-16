'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar, Clock, MapPin, Route as RouteIcon } from 'lucide-react'

interface Route {
  id: string
  name: string
  date: string
  start_time: string
  status: string
  stops: any[]
  total_distance_km: number  // Changed from total_distance
}

export default function InspectorRoutesPage() {
  const { userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && userRole?.inspector_id) {
      fetchRoutes()
    }
  }, [authLoading, userRole])

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('inspector_id', userRole?.inspector_id)
        .order('scheduled_date', { ascending: true })

      if (error) throw error
      setRoutes(data || [])
    } catch (error) {
      console.error('Error fetching routes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return <LoadingSpinner message="მარშრუტების ჩატვირთვა..." />
  }

  const plannedRoutes = routes.filter(r => r.status === 'planned')
  const inProgressRoutes = routes.filter(r => r.status === 'in_progress')
  const completedRoutes = routes.filter(r => r.status === 'completed')

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="ჩემი მარშრუტები"
        description="თქვენზე დანიშნული მარშრუტები"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="სულ მარშრუტები"
            value={routes.length}
            icon={RouteIcon}
            color="blue"
          />
          <StatCard
            label="დაგეგმილი"
            value={plannedRoutes.length}
            icon={Calendar}
            color="purple"
          />
          <StatCard
            label="მიმდინარე"
            value={inProgressRoutes.length}
            icon={Clock}
            color="amber"
          />
          <StatCard
            label="დასრულებული"
            value={completedRoutes.length}
            icon={MapPin}
            color="green"
          />
        </div>

        {/* Routes List */}
        {routes.length === 0 ? (
          <EmptyState
            icon={<RouteIcon className="w-16 h-16" />}
            title="მარშრუტები არ არის"
            description="თქვენზე ჯერ არ არის დანიშნული მარშრუტები"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RouteCard({ route }: { route: Route }) {
  const statusColors = {
    planned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const statusLabels = {
    planned: 'დაგეგმილი',
    in_progress: 'მიმდინარე',
    completed: 'დასრულებული',
    cancelled: 'გაუქმებული',
  }

  return (
    <div className="bg-white rounded-lg border hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{route.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[route.status as keyof typeof statusColors]}`}>
          {statusLabels[route.status as keyof typeof statusLabels]}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{new Date(route.date).toLocaleDateString('ka-GE')}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{route.start_time}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{route.stops?.length || 0} გაჩერება</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <RouteIcon className="w-4 h-4" />
          <span>{route.total_distance_km?.toFixed(1) || '0.0'} კმ</span>
        </div>
      </div>

      <button
        className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        ნახვა
      </button>
    </div>
  )
}
