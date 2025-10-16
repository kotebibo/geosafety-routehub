'use client'

import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { RoutesTable } from '@/components/routes/RoutesTable'
import { useRoutes } from '@/hooks/useRoutes'
import { Route as RouteIcon, Calendar, CheckCircle, Plus } from 'lucide-react'

export default function RoutesManagePage() {
  const router = useRouter()
  const {
    routes,
    inspectors,
    loading,
    error,
    deleteRoute,
    reassignRoute,
  } = useRoutes()

  if (loading) {
    return <LoadingSpinner message="მარშრუტების ჩატვირთვა..." />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">დაფიქსირდა შეცდომა</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            თავიდან ცდა
          </button>
        </div>
      </div>
    )
  }

  const plannedRoutes = routes.filter(r => r.status === 'planned')
  const inProgressRoutes = routes.filter(r => r.status === 'in_progress')
  const completedRoutes = routes.filter(r => r.status === 'completed')

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="მარშრუტების მართვა"
        description="ყველა შექმნილი მარშრუტი"
        action={{
          label: 'ახალი მარშრუტი',
          onClick: () => router.push('/routes/builder'),
          icon: <Plus className="w-5 h-5" />,
        }}
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
            icon={RouteIcon}
            color="amber"
          />
          <StatCard
            label="დასრულებული"
            value={completedRoutes.length}
            icon={CheckCircle}
            color="green"
          />
        </div>

        {/* Routes Table */}
        {routes.length === 0 ? (
          <EmptyState
            icon={<RouteIcon className="w-16 h-16" />}
            title="მარშრუტები არ არის"
            description="შექმენით პირველი მარშრუტი"
            action={{
              label: 'ახალი მარშრუტი',
              onClick: () => router.push('/routes/builder'),
            }}
          />
        ) : (
          <RoutesTable
            routes={routes}
            inspectors={inspectors}
            onDelete={deleteRoute}
            onReassign={reassignRoute}
          />
        )}
      </div>
    </div>
  )
}
