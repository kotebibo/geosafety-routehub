'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useAnalytics } from '@/features/analytics/hooks/useAnalytics'
import { AnalyticsKPICards } from '@/features/analytics/components/AnalyticsKPICards'
import {
  RoutesOverTimeChart,
  InspectorWorkloadChart,
  RouteStatusChart,
  TopCompaniesChart,
  WeeklyDistanceChart,
} from '@/features/analytics/components/charts'
import { OverdueInspectionsList } from '@/features/analytics/components/OverdueInspectionsList'
import { RefreshCw } from 'lucide-react'

export default function AnalyticsPage() {
  const { userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const analytics = useAnalytics()

  const currentRole = userRole?.role || ''
  const isAllowed = currentRole === 'admin' || currentRole === 'dispatcher'

  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.push('/')
    }
  }, [authLoading, isAllowed, router])

  if (authLoading || !isAllowed) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Overview of operations and performance metrics</p>
      </div>

      {/* KPI Cards */}
      {analytics.kpis.data && (
        <AnalyticsKPICards kpis={analytics.kpis.data} />
      )}
      {analytics.kpis.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg border p-4 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {/* Charts Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {analytics.routesByDay.isLoading ? (
          <div className="bg-white rounded-lg border p-6 h-[370px] animate-pulse" />
        ) : analytics.routesByDay.data ? (
          <RoutesOverTimeChart data={analytics.routesByDay.data} />
        ) : null}

        {analytics.routeStatus.isLoading ? (
          <div className="bg-white rounded-lg border p-6 h-[370px] animate-pulse" />
        ) : analytics.routeStatus.data ? (
          <RouteStatusChart data={analytics.routeStatus.data} />
        ) : null}
      </div>

      {/* Charts Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {analytics.inspectorWorkload.isLoading ? (
          <div className="bg-white rounded-lg border p-6 h-[370px] animate-pulse" />
        ) : analytics.inspectorWorkload.data ? (
          <InspectorWorkloadChart data={analytics.inspectorWorkload.data} />
        ) : null}

        {analytics.topCompanies.isLoading ? (
          <div className="bg-white rounded-lg border p-6 h-[370px] animate-pulse" />
        ) : analytics.topCompanies.data ? (
          <TopCompaniesChart data={analytics.topCompanies.data} />
        ) : null}
      </div>

      {/* Full-width Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {analytics.weeklyDistance.isLoading ? (
          <div className="bg-white rounded-lg border p-6 h-[370px] animate-pulse" />
        ) : analytics.weeklyDistance.data ? (
          <WeeklyDistanceChart data={analytics.weeklyDistance.data} />
        ) : null}

        {analytics.overdueInspections.isLoading ? (
          <div className="bg-white rounded-lg border p-6 h-[370px] animate-pulse" />
        ) : analytics.overdueInspections.data ? (
          <OverdueInspectionsList inspections={analytics.overdueInspections.data} />
        ) : null}
      </div>
    </div>
  )
}
