/**
 * Sentry Configuration (Client-Side)
 * 
 * To use this:
 * 1. Sign up at https://sentry.io
 * 2. Create a new project for Next.js
 * 3. Get your DSN from project settings
 * 4. Add to .env.local:
 *    NEXT_PUBLIC_SENTRY_DSN=your_dsn_here
 * 5. Install Sentry: npm install @sentry/nextjs
 * 6. Run: npx @sentry/wizard -i nextjs
 */

// Uncomment when ready to use Sentry
/*
import * as Sentry from '@sentry/nextjs'
import { env, isDevelopment, isProduction } from '@/config/env'

// Only initialize in production or when explicitly enabled
if (isProduction || env.features.enableDebugMode) {
  Sentry.init({
    // Your Sentry DSN
    dsn: env.analytics.sentryDsn,
    
    // Environment
    environment: env.app.env,
    
    // Performance Monitoring
    tracesSampleRate: isDevelopment ? 1.0 : 0.1, // 100% in dev, 10% in prod
    
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of errors
    
    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: [
          'localhost',
          env.app.url,
          /^\//,
        ],
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove cookies
      if (event.request) {
        delete event.request.cookies
      }
      
      // Remove authorization headers
      if (event.request?.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.cookie
      }
      
      // Filter out certain errors
      const error = hint.originalException
      if (error instanceof Error) {
        // Ignore network errors (users might have bad connection)
        if (error.message.includes('Failed to fetch')) {
          return null
        }
        
        // Ignore specific user-initiated errors
        if (error.message.includes('User cancelled')) {
          return null
        }
      }
      
      return event
    },
    
    // Set user context
    beforeBreadcrumb(breadcrumb) {
      // Filter sensitive breadcrumbs
      if (breadcrumb.category === 'console') {
        return null
      }
      
      return breadcrumb
    },
  })
}

// Helper to set user context
export function setSentryUser(user: { id: string; email?: string; role?: string }) {
  if (typeof window !== 'undefined' && window.Sentry) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    })
  }
}

// Helper to clear user context (on logout)
export function clearSentryUser() {
  if (typeof window !== 'undefined' && window.Sentry) {
    Sentry.setUser(null)
  }
}

// Helper to add context to errors
export function addSentryContext(key: string, data: Record<string, any>) {
  if (typeof window !== 'undefined' && window.Sentry) {
    Sentry.setContext(key, data)
  }
}

// Helper to capture custom exceptions
export function captureSentryException(error: Error, context?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.Sentry) {
    Sentry.captureException(error, {
      contexts: { custom: context },
    })
  }
}

// Helper to capture custom messages
export function captureSentryMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (typeof window !== 'undefined' && window.Sentry) {
    Sentry.captureMessage(message, level)
  }
}
*/

// Placeholder functions when Sentry is not installed
export function setSentryUser(user: any) {
  // Will be implemented when Sentry is installed
  console.log('[Sentry Placeholder] Set user:', user.id)
}

export function clearSentryUser() {
  console.log('[Sentry Placeholder] Clear user')
}

export function addSentryContext(key: string, data: Record<string, any>) {
  console.log('[Sentry Placeholder] Add context:', key, data)
}

export function captureSentryException(error: Error, context?: Record<string, any>) {
  console.error('[Sentry Placeholder] Capture exception:', error, context)
}

export function captureSentryMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(`[Sentry Placeholder] ${level}:`, message)
}
