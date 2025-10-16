/**
 * Monitoring & Logging Utilities
 * 
 * Centralized exports for all monitoring functionality
 */

// Logger
export { logger, LogLevel } from './logger'

// Error tracking (Sentry)
export { 
  Sentry,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUserContext,
  clearUserContext 
} from './sentry'

// Performance monitoring
export {
  measurePerformance,
  PerformanceMarker,
  trackPageLoad,
  trackWebVitals,
  trackApiCall,
  trackDbQuery,
  trackMemoryUsage,
} from './performance'

// Error boundaries (re-export from components)
export { ErrorBoundary, PageErrorBoundary, ComponentErrorBoundary } from '@/components/ErrorBoundary'
