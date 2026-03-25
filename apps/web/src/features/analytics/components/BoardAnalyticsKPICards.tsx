'use client'

import { MapPin, Users, DollarSign, TrendingUp } from 'lucide-react'
import { StatCard } from '@/shared/components/ui/StatCard'
import type { BoardAnalyticsKPI } from '@/services/board-analytics.service'

interface BoardAnalyticsKPICardsProps {
  kpis: BoardAnalyticsKPI
}

export function BoardAnalyticsKPICards({ kpis }: BoardAnalyticsKPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="ინსპექტორები" value={kpis.totalInspectors} icon={Users} color="blue" />
      <StatCard label="ლოკაციები" value={kpis.totalLocations} icon={MapPin} color="green" />
      <StatCard
        label="ჯამური შემოსავალი"
        value={`₾${kpis.totalRevenue.toLocaleString()}`}
        icon={DollarSign}
        color="purple"
      />
      <StatCard
        label="საშუალო / ლოკაცია"
        value={`₾${kpis.avgRevenuePerLocation}`}
        icon={TrendingUp}
        color="amber"
      />
    </div>
  )
}
