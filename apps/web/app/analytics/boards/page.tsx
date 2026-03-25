'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useBoardAnalytics } from '@/features/analytics/hooks/useBoardAnalytics'
import { BoardAnalyticsKPICards } from '@/features/analytics/components/BoardAnalyticsKPICards'
import {
  RevenueByInspectorChart,
  LocationsByInspectorChart,
  RevenueShareChart,
  TopLocationsChart,
} from '@/features/analytics/components/charts'
import { RefreshCw } from 'lucide-react'

export default function BoardAnalyticsPage() {
  const { userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const analytics = useBoardAnalytics()

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
        <RefreshCw className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">ფინანსური ანალიტიკა</h1>
        <p className="mt-1 text-sm text-text-secondary">
          ინსპექტორების და ლოკაციების შემოსავლის ანალიზი
        </p>
      </div>

      {/* KPI Cards */}
      {analytics.kpis.data && <BoardAnalyticsKPICards kpis={analytics.kpis.data} />}
      {analytics.kpis.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-bg-primary rounded-lg border p-4 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {/* Row 1: Revenue by Inspector + Revenue Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {analytics.inspectorRevenue.isLoading ? (
          <div className="bg-bg-primary rounded-lg border p-6 h-[420px] animate-pulse" />
        ) : analytics.inspectorRevenue.data ? (
          <RevenueByInspectorChart data={analytics.inspectorRevenue.data} />
        ) : null}

        {analytics.inspectorRevenue.isLoading ? (
          <div className="bg-bg-primary rounded-lg border p-6 h-[420px] animate-pulse" />
        ) : analytics.inspectorRevenue.data ? (
          <RevenueShareChart data={analytics.inspectorRevenue.data} />
        ) : null}
      </div>

      {/* Row 2: Locations by Inspector + Top Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {analytics.inspectorRevenue.isLoading ? (
          <div className="bg-bg-primary rounded-lg border p-6 h-[420px] animate-pulse" />
        ) : analytics.inspectorRevenue.data ? (
          <LocationsByInspectorChart data={analytics.inspectorRevenue.data} />
        ) : null}

        {analytics.topLocations.isLoading ? (
          <div className="bg-bg-primary rounded-lg border p-6 h-[420px] animate-pulse" />
        ) : analytics.topLocations.data ? (
          <TopLocationsChart data={analytics.topLocations.data} />
        ) : null}
      </div>
    </div>
  )
}
