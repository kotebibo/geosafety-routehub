import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Server-side specific settings
  enabled: process.env.NODE_ENV === 'production',
  
  // Filtering
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request) {
      delete event.request.cookies
      
      if (event.request.headers) {
        delete event.request.headers.Authorization
        delete event.request.headers.authorization
        delete event.request.headers.Cookie
        delete event.request.headers.cookie
      }
    }
    
    // Filter out sensitive context data
    if (event.contexts) {
      delete event.contexts.user?.ip_address
      delete event.contexts.user?.email
    }
    
    return event
  },
  
  // Ignore expected errors
  ignoreErrors: [
    'Authentication required',
    'Insufficient permissions',
    'ECONNREFUSED',
    'ETIMEDOUT',
  ],
})
