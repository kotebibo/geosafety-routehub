'use client'

import { MapPin, FileText, DollarSign, TrendingUp } from 'lucide-react'
import { StatCard } from '@/shared/components/ui/StatCard'
import type { GlobalKPI } from '@/services/board-analytics.service'

interface BoardAnalyticsKPICardsProps {
  kpis: GlobalKPI
}

export function BoardAnalyticsKPICards({ kpis }: BoardAnalyticsKPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="ჯამური შემოსავალი"
        value={`₾${kpis.totalRevenue.toLocaleString()}`}
        icon={DollarSign}
        color="purple"
      />
      <StatCard
        label="აქტიური კონტრაქტები"
        value={kpis.activeContracts}
        icon={FileText}
        color="blue"
      />
      <StatCard label="ლოკაციები" value={kpis.totalLocations} icon={MapPin} color="green" />
      <StatCard
        label="საშუალო / კომპანია"
        value={`₾${kpis.avgRevenuePerCompany.toLocaleString()}`}
        icon={TrendingUp}
        color="amber"
      />
    </div>
  )
}
