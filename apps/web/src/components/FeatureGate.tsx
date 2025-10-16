/**
 * Feature Gate Component
 * 
 * Conditionally render components based on feature flags
 */

'use client'

import { ReactNode } from 'react'
import { isFeatureEnabled, FeatureFlag } from '@/config/features'

interface FeatureGateProps {
  feature: FeatureFlag
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Show children only if feature is enabled
 */
export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  if (!isFeatureEnabled(feature)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Show children only if feature is DISABLED
 */
export function FeatureGateInverse({ feature, children, fallback = null }: FeatureGateProps) {
  if (isFeatureEnabled(feature)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
