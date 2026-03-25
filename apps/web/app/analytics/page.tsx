'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useBoardAnalytics } from '@/features/analytics/hooks/useBoardAnalytics'
import { BoardAnalyticsKPICards } from '@/features/analytics/components/BoardAnalyticsKPICards'
import { ExpiringContractsTable } from '@/features/analytics/components/ExpiringContractsTable'
import { CompanyAnalyticsTable } from '@/features/analytics/components/CompanyAnalyticsTable'
import {
  ServiceTypeRevenueChart,
  MonthlyTrendChart,
  PaymentMethodChart,
  TopCompaniesRevenueChart,
  WorkloadScatterChart,
  ExpiryTimelineChart,
  ValueDistributionChart,
  InspectorRevenueBarChart,
  InspectorLocationsBarChart,
  TopLocationsChart,
  RevenueShareChart,
} from '@/features/analytics/components/charts'
import { RefreshCw } from 'lucide-react'

type Tab = 'finance' | 'inspectors' | 'companies'

const TABS: { key: Tab; label: string }[] = [
  { key: 'finance', label: 'ფინანსები' },
  { key: 'inspectors', label: 'ინსპექტორები' },
  { key: 'companies', label: 'კომპანიები' },
]

export default function AnalyticsPage() {
  const { userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const analytics = useBoardAnalytics()
  const [activeTab, setActiveTab] = useState<Tab>('finance')

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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">ფინანსური ანალიტიკა</h1>
        <p className="mt-1 text-sm text-text-secondary">
          კომპანიების, ინსპექტორების და ლოკაციების ფინანსური მონაცემები
        </p>
      </div>

      {/* Global KPIs */}
      {analytics.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-bg-primary rounded-lg border p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : analytics.globalKPIs ? (
        <BoardAnalyticsKPICards kpis={analytics.globalKPIs} />
      ) : null}

      {/* Tab Bar */}
      <div className="mt-8 border-b">
        <div className="flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {analytics.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="bg-bg-primary rounded-lg border p-6 h-[400px] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'finance' && <FinanceTab analytics={analytics} />}
            {activeTab === 'inspectors' && <InspectorsTab analytics={analytics} />}
            {activeTab === 'companies' && <CompaniesTab analytics={analytics} />}
          </>
        )}
      </div>
    </div>
  )
}

// ── Tab Components ──

function FinanceTab({ analytics }: { analytics: ReturnType<typeof useBoardAnalytics> }) {
  return (
    <div className="space-y-6">
      {/* Row 1: Service Type Revenue + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ServiceTypeRevenueChart data={analytics.serviceTypeRevenue} />
        </div>
        <PaymentMethodChart data={analytics.paymentMethods} />
      </div>

      {/* Row 2: Monthly Trend */}
      <MonthlyTrendChart data={analytics.monthlyTrend} />

      {/* Row 3: Top Companies */}
      <TopCompaniesRevenueChart data={analytics.topCompanies} />
    </div>
  )
}

function InspectorsTab({ analytics }: { analytics: ReturnType<typeof useBoardAnalytics> }) {
  return (
    <div className="space-y-6">
      {/* Row 1: Revenue + Locations bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InspectorRevenueBarChart data={analytics.inspectorSummaries} />
        <InspectorLocationsBarChart data={analytics.inspectorSummaries} />
      </div>

      {/* Row 2: Scatter + Revenue Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkloadScatterChart data={analytics.inspectorScatter} />
        <RevenueShareChart
          data={analytics.inspectorSummaries.map(s => ({
            name: s.name,
            total_amount: s.total_amount,
            locations: s.locations,
            pct_amount: s.pct_amount,
          }))}
        />
      </div>

      {/* Row 3: Top Locations */}
      <TopLocationsChart data={analytics.topLocations} />
    </div>
  )
}

function CompaniesTab({ analytics }: { analytics: ReturnType<typeof useBoardAnalytics> }) {
  return (
    <div className="space-y-6">
      {/* Row 1: Expiry Timeline + Value Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiryTimelineChart data={analytics.expiryTimeline} />
        <ValueDistributionChart data={analytics.valueBuckets} />
      </div>

      {/* Row 2: Expiring Contracts Table */}
      <ExpiringContractsTable data={analytics.expiringContracts} />

      {/* Row 3: Full Company Table */}
      <CompanyAnalyticsTable data={analytics.companyTable} />
    </div>
  )
}
