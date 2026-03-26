import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple'
}

export function StatCard({ label, value, icon: Icon, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'text-color-info bg-color-info/10',
    green: 'text-color-success bg-color-success/10',
    amber: 'text-color-warning bg-color-warning/10',
    red: 'text-color-error bg-color-error/10',
    purple: 'text-monday-primary bg-monday-primary/10',
  }

  return (
    <div className="bg-bg-primary rounded-lg border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary mb-1">{label}</p>
          <p className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>{value}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
