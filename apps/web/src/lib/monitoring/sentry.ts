/**
 * Sentry Error Monitoring Setup
 * Complete configuration for production error tracking
 */

import * as Sentry from '@sentry/nextjs'
import { env } from '@/config/env'

const SENTRY_DSN = env.analytics.sentryDsn

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Environment
    environment: env.app.env,
    
    // Performance Monitoring
    tracesSampleRate: env.app.env === 'production' ? 0.1 : 1.0,
    
    // Session Replay (if available in your version)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    
    // Filtering
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      // Ignore benign errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
    
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies
      }
      
      // Don't send events in development
      if (env.app.env === 'development') {
        console.log('Sentry Event (dev mode):', event)
        return null
      }
      
      return event
    },
  })
}

// Export for use in other files
export { Sentry }

// Helper to capture exceptions with context
export function captureException(
  error: Error,
  context?: Record<string, any>
): void {
  if (SENTRY_DSN) {
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    })
  } else {
    console.error('Error:', error, context)
  }
}

// Helper to capture messages
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
): void {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level: level === 'info' ? 'info' : level === 'warning' ? 'warning' : 'error',
      contexts: {
        custom: context,
      },
    })
  } else {
    console.log(`[${level.toUpperCase()}]:`, message, context)
  }
}

// Helper to add breadcrumbs
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
): void {
  if (SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data,
      timestamp: Date.now(),
    })
  }
}

// Helper to set user context
export function setUserContext(user: {
  id: string
  email?: string
  username?: string
  role?: string
}): void {
  if (SENTRY_DSN) {
    Sentry.setUser(user)
  }
}

// Helper to clear user context
export function clearUserContext(): void {
  if (SENTRY_DSN) {
    Sentry.setUser(null)
  }
}
