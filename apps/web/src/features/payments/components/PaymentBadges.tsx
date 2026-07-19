import { CheckCircle2, AlertCircle, Ban } from 'lucide-react'

import { cn } from '@/lib/utils'

type Translate = (key: string) => string

export function getSourceBadge(source: string | null, t: Translate) {
  if (!source) return null
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: t('payments.badges.sourceActive'),
      className: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    one_time: {
      label: t('payments.badges.sourceOneTime'),
      className: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    paused: {
      label: t('payments.badges.sourcePaused'),
      className: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    ended: {
      label: t('payments.badges.sourceEnded'),
      className: 'bg-red-50 text-red-600 border-red-200',
    },
  }
  const c = config[source]
  if (!c) return null
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
        c.className
      )}
    >
      {c.label}
    </span>
  )
}

export function getStatusBadge(status: string, t: Translate) {
  const styles = {
    matched: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    unmatched: 'bg-amber-50 text-amber-700 border-amber-200',
    ignored: 'bg-gray-50 text-gray-500 border-gray-200',
  }
  const icons = {
    matched: <CheckCircle2 className="w-3 h-3" />,
    unmatched: <AlertCircle className="w-3 h-3" />,
    ignored: <Ban className="w-3 h-3" />,
  }
  const labels = {
    matched: t('payments.badges.statusMatched'),
    unmatched: t('payments.badges.statusUnmatched'),
    ignored: t('payments.badges.statusIgnored'),
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border',
        styles[status as keyof typeof styles] || ''
      )}
    >
      {icons[status as keyof typeof icons]}
      {labels[status as keyof typeof labels] || status}
    </span>
  )
}
