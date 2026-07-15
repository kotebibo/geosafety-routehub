'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function NotFound() {
  const t = useTranslations()

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-monday-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-text-primary mb-2">{t('404.title')}</h2>
        <p className="text-text-secondary mb-8">{t('404.description')}</p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors"
        >
          {t('404.goHome')}
        </Link>
      </div>
    </div>
  )
}
