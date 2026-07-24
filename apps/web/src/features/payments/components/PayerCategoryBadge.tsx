import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

import type { PayerCategory } from '@/services/financial-analytics.service'

const CATEGORY_STYLES: Record<PayerCategory, string> = {
  good: 'bg-green-500/10 text-green-500 border-green-500/30',
  average: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  bad: 'bg-red-500/10 text-red-500 border-red-500/30',
}

interface PayerCategoryBadgeProps {
  category: PayerCategory
}

export function PayerCategoryBadge({ category }: PayerCategoryBadgeProps) {
  const t = useTranslations()
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap',
        CATEGORY_STYLES[category]
      )}
    >
      {t(`payments.debtors.category.${category}`)}
    </span>
  )
}
