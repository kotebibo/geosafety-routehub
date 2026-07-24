import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Settings2 } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { PayerCriteria } from '@/services/financial-analytics.service'

interface PayerCriteriaEditorProps {
  criteria: PayerCriteria | null
  saving: boolean
  onSave: (criteria: PayerCriteria) => void
}

export function PayerCriteriaEditor({ criteria, saving, onSave }: PayerCriteriaEditorProps) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [graceDays, setGraceDays] = useState('')
  const [badMonths, setBadMonths] = useState('')
  const [badRatio, setBadRatio] = useState('')

  useEffect(() => {
    if (criteria) {
      setGraceDays(String(criteria.good_grace_days))
      setBadMonths(String(criteria.bad_months_overdue))
      setBadRatio(String(criteria.bad_debt_ratio))
    }
  }, [criteria])

  const handleSave = () => {
    onSave({
      good_grace_days: Number(graceDays),
      bad_months_overdue: Number(badMonths),
      bad_debt_ratio: Number(badRatio),
    })
  }

  const fields = [
    {
      label: t('payments.debtors.criteria.graceDays'),
      hint: t('payments.debtors.criteria.graceDaysHint'),
      value: graceDays,
      onChange: setGraceDays,
      min: 0,
      max: 31,
    },
    {
      label: t('payments.debtors.criteria.badMonths'),
      hint: t('payments.debtors.criteria.badMonthsHint'),
      value: badMonths,
      onChange: setBadMonths,
      min: 1,
      max: 24,
    },
    {
      label: t('payments.debtors.criteria.badRatio'),
      hint: t('payments.debtors.criteria.badRatioHint'),
      value: badRatio,
      onChange: setBadRatio,
      min: 0,
      max: 1000,
    },
  ]

  return (
    <div className="bg-bg-primary rounded-xl border border-border-light">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-primary"
      >
        <span className="inline-flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-text-tertiary" />
          {t('payments.debtors.criteria.title')}
        </span>
        <ChevronDown
          className={cn('w-4 h-4 text-text-tertiary transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border-light pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fields.map(field => (
              <div key={field.label}>
                <label className="block text-xs text-text-tertiary mb-1">{field.label}</label>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border-light bg-bg-primary text-sm text-text-primary"
                />
                <p className="text-[11px] text-text-tertiary mt-1">{field.hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !criteria}
              className="px-4 py-2 rounded-lg bg-monday-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? '...' : t('payments.debtors.criteria.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
