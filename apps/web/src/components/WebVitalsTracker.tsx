/**
 * Web Vitals Tracker Component
 * 
 * Tracks Core Web Vitals and sends to monitoring
 */

'use client'

import { useEffect } from 'react'
import { trackWebVitals, trackPageLoad } from '@/lib/monitoring'

export function WebVitalsTracker() {
  useEffect(() => {
    // Track web vitals
    trackWebVitals()
    
    // Track page load
    trackPageLoad(window.location.pathname)
  }, [])

  return null // This component doesn't render anything
}
