'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations()

  useEffect(() => {
    console.error('Admin error:', error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center bg-bg-secondary p-8">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚙️</div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          {t('errorPage.adminTitle')}
        </h2>
        <p className="text-text-secondary mb-6">{t('errorPage.adminDescription')}</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors"
        >
          {t('errorBoundary.retry')}
        </button>
      </div>
    </div>
  )
}
