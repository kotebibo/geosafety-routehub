import { StatCard } from '@/shared/components/ui'
import { Building2, Check, X, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface AssignmentStatsProps {
  stats: {
    total: number
    assigned: number
    unassigned: number
  }
  inspectorCount: number
}

export function AssignmentStatCards({ stats, inspectorCount }: AssignmentStatsProps) {
  const t = useTranslations()
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        label={t('assignments.totalCompanies')}
        value={stats.total}
        icon={Building2}
        color="blue"
      />
      <StatCard
        label={t('assignments.assigned')}
        value={stats.assigned}
        icon={Check}
        color="green"
      />
      <StatCard
        label={t('assignments.unassigned')}
        value={stats.unassigned}
        icon={X}
        color="amber"
      />
      <StatCard label={t('nav.officers')} value={inspectorCount} icon={Users} color="purple" />
    </div>
  )
}
