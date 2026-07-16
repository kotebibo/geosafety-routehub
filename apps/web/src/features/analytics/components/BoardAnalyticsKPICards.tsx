'use client'

import { useTranslations } from 'next-intl'
import { MapPin, FileText, DollarSign, TrendingUp } from 'lucide-react'
import { StatCard } from '@/shared/components/ui/StatCard'
import type { GlobalKPI } from '@/services/board-analytics.service'

interface BoardAnalyticsKPICardsProps {
  kpis: GlobalKPI
}

export function BoardAnalyticsKPICards({ kpis }: BoardAnalyticsKPICardsProps) {
  const t = useTranslations()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label={t('analytics.kpi.totalRevenue')}
        value={`₾${kpis.totalRevenue.toLocaleString()}`}
        icon={DollarSign}
        color="purple"
      />
      <StatCard
        label={t('analytics.kpi.activeContracts')}
        value={kpis.activeContracts}
        icon={FileText}
        color="blue"
      />
      <StatCard
        label={t('analytics.kpi.locations')}
        value={kpis.totalLocations}
        icon={MapPin}
        color="green"
      />
      <StatCard
        label={t('analytics.kpi.avgPerCompany')}
        value={`₾${kpis.avgRevenuePerCompany.toLocaleString()}`}
        icon={TrendingUp}
        color="amber"
      />
    </div>
  )
}
