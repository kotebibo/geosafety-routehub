import { StatCard } from '@/components/ui/StatCard'
import { Building2, Check, X, Users } from 'lucide-react'

interface AssignmentStatsProps {
  stats: {
    total: number
    assigned: number
    unassigned: number
  }
  inspectorCount: number
}

export function AssignmentStatCards({ stats, inspectorCount }: AssignmentStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="სულ კომპანიები"
        value={stats.total}
        icon={Building2}
        color="blue"
      />
      <StatCard
        label="დანიშნული"
        value={stats.assigned}
        icon={Check}
        color="green"
      />
      <StatCard
        label="არადანიშნული"
        value={stats.unassigned}
        icon={X}
        color="amber"
      />
      <StatCard
        label="ინსპექტორები"
        value={inspectorCount}
        icon={Users}
        color="purple"
      />
    </div>
  )
}
