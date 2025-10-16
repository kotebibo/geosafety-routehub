import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Integrations
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Filtering
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request) {
      // Remove cookies
      delete event.request.cookies
      
      // Remove authorization headers
      if (event.request.headers) {
        delete event.request.headers.Authorization
        delete event.request.headers.authorization
        delete event.request.headers.Cookie
        delete event.request.headers.cookie
      }
    }
    
    // Don't send development errors to Sentry
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sentry Event (dev):', event)
      return null
    }
    
    return event
  },
  
  // Ignore expected errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Network errors
    'NetworkError',
    'Network request failed',
    // Expected auth errors
    'Authentication required',
    'Insufficient permissions',
  ],
})
