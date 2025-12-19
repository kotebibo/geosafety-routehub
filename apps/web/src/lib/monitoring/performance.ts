/**
 * Performance Monitoring Utilities
 * 
 * Track and report performance metrics for optimization
 */

import { logger } from './logger'

/**
 * Measure function execution time
 */
export function measurePerformance<T>(
  fn: () => T | Promise<T>,
  label: string
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - startTime
      
      logger.performance(label, duration, 'ms')
      
      // Warn if slow
      if (duration > 1000) {
        logger.warn(`Slow operation: ${label}`, { duration })
      }
      
      resolve(result)
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error(`Failed operation: ${label}`, error as Error, { duration })
      reject(error)
    }
  })
}

/**
 * Performance marker for tracking page loads and interactions
 */
export class PerformanceMarker {
  private startTime: number
  private marks: Map<string, number>

  constructor(private label: string) {
    this.startTime = performance.now()
    this.marks = new Map()
    
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${label}-start`)
    }
  }

  /**
   * Mark a checkpoint
   */
  mark(checkpoint: string): void {
    const elapsed = performance.now() - this.startTime
    this.marks.set(checkpoint, elapsed)
    
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${this.label}-${checkpoint}`)
    }
    
    logger.debug(`${this.label} - ${checkpoint}`, { elapsed })
  }

  /**
   * Finish and log all measurements
   */
  finish(): void {
    const totalTime = performance.now() - this.startTime
    
    logger.performance(this.label, totalTime, 'ms')
    
    // Log all checkpoints
    if (this.marks.size > 0) {
      const checkpoints: Record<string, number> = {}
      this.marks.forEach((time, name) => {
        checkpoints[name] = time
      })
      logger.debug(`${this.label} checkpoints`, checkpoints)
    }
    
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${this.label}-end`)
      
      try {
        performance.measure(
          this.label,
          `${this.label}-start`,
          `${this.label}-end`
        )
      } catch (e) {
        // Ignore measurement errors
      }
    }
  }
}

/**
 * Track page load performance
 */
export function trackPageLoad(pageName: string): void {
  if (typeof window === 'undefined') return

  // Wait for page to fully load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      if (perfData) {
        logger.performance(`Page load: ${pageName}`, perfData.loadEventEnd, 'ms')
        
        // Log key metrics
        logger.info(`Performance metrics for ${pageName}`, {
          type: 'page_load',
          dns: perfData.domainLookupEnd - perfData.domainLookupStart,
          tcp: perfData.connectEnd - perfData.connectStart,
          ttfb: perfData.responseStart - perfData.requestStart,
          download: perfData.responseEnd - perfData.responseStart,
          domProcessing: perfData.domComplete - perfData.domContentLoadedEventEnd,
          total: perfData.loadEventEnd,
        })
      }
    }, 0)
  })
}

/**
 * Track Web Vitals (Core Web Vitals)
 */
export function trackWebVitals(): void {
  if (typeof window === 'undefined') return

  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        
        logger.performance('LCP (Largest Contentful Paint)', lastEntry.renderTime || lastEntry.loadTime, 'ms')
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (e) {
      // Ignore if not supported
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          logger.performance('FID (First Input Delay)', entry.processingStart - entry.startTime, 'ms')
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch (e) {
      // Ignore if not supported
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })

      // Report CLS on page hide
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          logger.performance('CLS (Cumulative Layout Shift)', clsValue, 'score')
        }
      })
    } catch (e) {
      // Ignore if not supported
    }
  }
}

/**
 * Track API call performance
 */
export async function trackApiCall<T>(
  method: string,
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now()
  
  try {
    const result = await fn()
    const duration = performance.now() - startTime
    
    logger.apiCall(method, endpoint, duration, 200)
    
    return result
  } catch (error: any) {
    const duration = performance.now() - startTime
    const status = error.status || 500
    
    logger.apiCall(method, endpoint, duration, status)
    
    throw error
  }
}

/**
 * Track database query performance
 */
export async function trackDbQuery<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now()
  
  try {
    const result = await fn()
    const duration = performance.now() - startTime
    
    logger.dbQuery(operation, table, duration)
    
    // Warn on slow queries
    if (duration > 1000) {
      logger.warn(`Slow database query: ${operation} on ${table}`, { duration })
    }
    
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error(`Database query failed: ${operation} on ${table}`, error as Error, { duration })
    throw error
  }
}

/**
 * Monitor memory usage (development only)
 */
export function trackMemoryUsage(): void {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return
  }

  if ('memory' in performance) {
    const memory = (performance as any).memory
    
    logger.debug('Memory usage', {
      used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
      total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB',
    })
  }
}
