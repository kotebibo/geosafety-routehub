'use client'

import { useTranslations } from 'next-intl'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ message, size = 'md' }: LoadingSpinnerProps) {
  const t = useTranslations()
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  }
  const resolvedMessage = message ?? t('common.loading')

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
      <div className="text-center">
        <div className={`animate-spin ${sizeClasses[size]} mb-4`}>⚙️</div>
        {resolvedMessage && <p className="text-text-secondary">{resolvedMessage}</p>}
      </div>
    </div>
  )
}
