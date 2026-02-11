'use client'

import { Building2, Users, Route, CheckCircle2 } from 'lucide-react'
import { StatCard } from '@/shared/components/ui/StatCard'
import type { AnalyticsKPI } from '@/services/analytics.service'

interface AnalyticsKPICardsProps {
  kpis: AnalyticsKPI
}

export function AnalyticsKPICards({ kpis }: AnalyticsKPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Active Companies"
        value={kpis.totalCompanies}
        icon={Building2}
        color="blue"
      />
      <StatCard
        label="Active Inspectors"
        value={kpis.activeInspectors}
        icon={Users}
        color="green"
      />
      <StatCard
        label="Routes This Month"
        value={kpis.routesThisMonth}
        icon={Route}
        color="purple"
      />
      <StatCard
        label="Completion Rate"
        value={`${kpis.completionRate}%`}
        icon={CheckCircle2}
        color="amber"
      />
    </div>
  )
}
