'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { MobileTrackingView } from '@/features/tracking/components/MobileTrackingView'
import { InspectorTrackingSkeleton } from '@/features/inspector/components/InspectorTrackingSkeleton'
import { Navigation } from 'lucide-react'

export default function InspectorTrackingPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const t = useTranslations()
  const inspectorId = user?.id ?? null
  const inspectorLoading = false

  const currentRole = userRole?.role || ''
  const isAllowed =
    currentRole === 'officer' || currentRole === 'admin' || currentRole === 'dispatcher'

  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.push('/')
    }
  }, [authLoading, isAllowed, router])

  if (authLoading || inspectorLoading) {
    return <InspectorTrackingSkeleton />
  }

  if (!inspectorId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen p-4">
        <Navigation className="w-12 h-12 text-text-disabled mb-4" />
        <h2 className="text-lg font-semibold text-text-primary">
          {t('inspectorTracking.noProfileTitle')}
        </h2>
        <p className="text-sm text-text-secondary mt-1 text-center">
          {t('inspectorTracking.noProfileDescription')}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-secondary py-6">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-text-primary">{t('inspectorTracking.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">{t('inspectorTracking.subtitle')}</p>
      </div>
      <MobileTrackingView inspectorId={inspectorId} />
    </div>
  )
}
