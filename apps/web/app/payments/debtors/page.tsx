'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui-monday/Toast'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

import {
  DebtorsSummaryCards,
  DebtorsTable,
  DebtorsSkeleton,
  PayerCriteriaEditor,
} from '@/features/payments/components'
import { useDebtors, usePayerCriteria } from '@/features/payments/hooks'

import type { PayerCategory, PayerCriteria } from '@/services/financial-analytics.service'

const PERIOD_OPTIONS = [3, 6, 12] as const

export default function DebtorsPage() {
  const router = useRouter()
  const t = useTranslations()
  const { showToast } = useToast()
  const { isAdmin, isDispatcher, loading: authLoading } = useAuth()

  const [monthsBack, setMonthsBack] = useState<number>(6)
  const [categoryFilter, setCategoryFilter] = useState<PayerCategory | 'all'>('all')

  const isAuthorized = isAdmin || isDispatcher
  const { data, loading, error, refetch } = useDebtors({ monthsBack, isAuthorized, authLoading })
  const { criteria, save, saving } = usePayerCriteria({ enabled: !authLoading && isAuthorized })

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAdmin && !isDispatcher) {
      router.push('/')
    }
  }, [authLoading, isAdmin, isDispatcher, router])

  const categoryCounts = useMemo(() => {
    const counts: Record<PayerCategory | 'all', number> = {
      all: data?.debtors.length || 0,
      good: 0,
      average: 0,
      bad: 0,
    }
    for (const d of data?.debtors || []) {
      counts[d.category]++
    }
    return counts
  }, [data])

  if (authLoading) {
    return <DebtorsSkeleton />
  }

  const handleSaveCriteria = async (next: PayerCriteria) => {
    try {
      await save(next)
      showToast(t('payments.debtors.criteria.saved'), 'success')
      refetch()
    } catch {
      showToast(t('payments.debtors.criteria.saveError'), 'error')
    }
  }

  const categories: Array<PayerCategory | 'all'> = ['all', 'good', 'average', 'bad']

  return (
    <div className="p-6 space-y-5 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/payments')}
            className="p-2 rounded-lg border border-border-light text-text-secondary hover:bg-bg-secondary transition-colors"
            aria-label={t('payments.debtors.back')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t('payments.debtors.title')}</h1>
            <p className="text-sm text-text-secondary mt-0.5">{t('payments.debtors.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">{t('payments.debtors.periodLabel')}</span>
          {PERIOD_OPTIONS.map(months => (
            <button
              key={months}
              onClick={() => setMonthsBack(months)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                monthsBack === months
                  ? 'bg-monday-primary text-white border-monday-primary'
                  : 'bg-bg-primary text-text-secondary border-border-light hover:bg-bg-secondary'
              )}
            >
              {t(`payments.debtors.months_${months}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <DebtorsSummaryCards summary={data?.summary || null} loading={loading} />

      {/* Criteria editor */}
      <PayerCriteriaEditor criteria={criteria} saving={saving} onSave={handleSaveCriteria} />

      {/* Category filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setCategoryFilter(category)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm border transition-colors',
              categoryFilter === category
                ? 'bg-monday-primary text-white border-monday-primary'
                : 'bg-bg-primary text-text-secondary border-border-light hover:bg-bg-secondary'
            )}
          >
            {t(`payments.debtors.category.${category}`)}
            <span className="ml-1.5 text-xs opacity-75">{categoryCounts[category]}</span>
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Debtors table */}
      <DebtorsTable
        debtors={data?.debtors || []}
        loading={loading}
        categoryFilter={categoryFilter}
        onNavigateToBoard={(boardId, itemId) =>
          router.push(`/boards/${boardId}${itemId ? `?item=${itemId}` : ''}`)
        }
      />
    </div>
  )
}
