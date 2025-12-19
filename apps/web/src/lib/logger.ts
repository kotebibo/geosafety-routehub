/**
 * Centralized Logging System
 * 
 * Provides consistent logging throughout the application
 * with context and error tracking support
 */

import { isDevelopment, isProduction } from '@/config/env'

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Log context interface
interface LogContext {
  userId?: string
  component?: string
  action?: string
  metadata?: Record<string, any>
  timestamp?: string
}

// Logger class
class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` | ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  private shouldLog(level: LogLevel): boolean {
    // In development, log everything
    if (isDevelopment) return true
    
    // In production, skip debug logs
    if (isProduction && level === LogLevel.DEBUG) return false
    
    return true
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return
    
    console.debug(this.formatMessage(LogLevel.DEBUG, message, context))
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return
    
    console.log(this.formatMessage(LogLevel.INFO, message, context))
    
    // In production, you could send to external service
    if (isProduction) {
      // TODO: Send to logging service (e.g., Logtail, Datadog)
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return
    
    console.warn(this.formatMessage(LogLevel.WARN, message, context))
    
    if (isProduction) {
      // TODO: Send to logging service
    }
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return
    
    const errorContext = {
      ...context,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
    }
    
    console.error(this.formatMessage(LogLevel.ERROR, message, errorContext))
    
    // In production, send to Sentry
    if (isProduction && typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error || new Error(message), {
        contexts: { custom: context },
      })
    }
  }

  /**
   * Log API requests
   */
  apiRequest(method: string, url: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${url}`, {
      ...context,
      component: 'API',
      action: 'request',
    })
  }

  /**
   * Log API responses
   */
  apiResponse(method: string, url: string, status: number, duration?: number, context?: LogContext): void {
    const logContext = {
      ...context,
      component: 'API',
      action: 'response',
      metadata: {
        status,
        duration: duration ? `${duration}ms` : undefined,
      },
    }

    if (status >= 400) {
      this.error(`API Response: ${method} ${url} - ${status}`, undefined, logContext)
    } else {
      this.info(`API Response: ${method} ${url} - ${status}`, logContext)
    }
  }

  /**
   * Log user actions
   */
  userAction(action: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, {
      ...context,
      component: 'User',
      action,
    })
  }

  /**
   * Log database operations
   */
  dbOperation(operation: string, table: string, context?: LogContext): void {
    this.debug(`DB Operation: ${operation} on ${table}`, {
      ...context,
      component: 'Database',
      action: operation,
      metadata: {
        table,
      },
    })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export helper functions for convenience
export const logDebug = logger.debug.bind(logger)
export const logInfo = logger.info.bind(logger)
export const logWarn = logger.warn.bind(logger)
export const logError = logger.error.bind(logger)
export const logApiRequest = logger.apiRequest.bind(logger)
export const logApiResponse = logger.apiResponse.bind(logger)
export const logUserAction = logger.userAction.bind(logger)
export const logDbOperation = logger.dbOperation.bind(logger)
