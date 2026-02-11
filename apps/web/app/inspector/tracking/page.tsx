'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useInspectorId } from '@/hooks/useInspectorId'
import { MobileTrackingView } from '@/features/tracking/components/MobileTrackingView'
import { RefreshCw, Navigation } from 'lucide-react'

export default function InspectorTrackingPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data: inspectorId, isLoading: inspectorLoading } = useInspectorId(user?.email)

  const currentRole = userRole?.role || ''
  const isAllowed = currentRole === 'inspector' || currentRole === 'admin' || currentRole === 'dispatcher'

  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.push('/')
    }
  }, [authLoading, isAllowed, router])

  if (authLoading || inspectorLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!inspectorId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen p-4">
        <Navigation className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700">No Inspector Profile</h2>
        <p className="text-sm text-gray-500 mt-1 text-center">
          Your account is not linked to an inspector profile. Contact an administrator.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">Location Tracking</h1>
        <p className="text-sm text-gray-500 mt-1">Share your location with dispatch</p>
      </div>
      <MobileTrackingView inspectorId={inspectorId} />
    </div>
  )
}
