/**
 * Centralized Logging System
 * 
 * Provides structured logging with context and different severity levels.
 * In production, logs are sent to monitoring service (Sentry).
 */

// Avoid circular dependency - directly check NODE_ENV
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

// Log entry structure
interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
  userId?: string
  sessionId?: string
}

// Color codes for console output (development only)
const colors = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  fatal: '\x1b[35m', // Magenta
  reset: '\x1b[0m',
}

class Logger {
  private sessionId: string

  constructor() {
    // Generate session ID for tracking related logs
    this.sessionId = this.generateSessionId()
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry
    
    if (isDevelopment) {
      const color = colors[level]
      const reset = colors.reset
      const contextStr = context ? ` ${JSON.stringify(context)}` : ''
      return `${color}[${level.toUpperCase()}]${reset} ${timestamp} - ${message}${contextStr}`
    }
    
    return JSON.stringify(entry)
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
      sessionId: this.sessionId,
    }
  }

  private log(entry: LogEntry): void {
    const formatted = this.formatMessage(entry)

    // Console output
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted)
        break
      case LogLevel.INFO:
        console.log(formatted)
        break
      case LogLevel.WARN:
        console.warn(formatted)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted)
        if (entry.error) {
          console.error(entry.error)
        }
        break
    }

    // In production, send to monitoring service
    if (isProduction) {
      this.sendToMonitoring(entry)
    }
  }

  private sendToMonitoring(entry: LogEntry): void {
    // This will be connected to Sentry
    // For now, we'll prepare the structure
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry
      
      if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
        if (entry.error) {
          Sentry.captureException(entry.error, {
            contexts: {
              custom: entry.context,
            },
            level: entry.level === LogLevel.FATAL ? 'fatal' : 'error',
          })
        } else {
          Sentry.captureMessage(entry.message, {
            contexts: {
              custom: entry.context,
            },
            level: entry.level === LogLevel.FATAL ? 'fatal' : 'error',
          })
        }
      }
    }
  }

  /**
   * Debug - Detailed information for debugging
   */
  debug(message: string, context?: Record<string, any>): void {
    if (isDevelopment) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context)
      this.log(entry)
    }
  }

  /**
   * Info - General informational messages
   */
  info(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context)
    this.log(entry)
  }

  /**
   * Warn - Warning messages for potentially harmful situations
   */
  warn(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context)
    this.log(entry)
  }

  /**
   * Error - Error messages for error events
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error)
    this.log(entry)
  }

  /**
   * Fatal - Very severe error events that will presumably lead the application to abort
   */
  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.FATAL, message, context, error)
    this.log(entry)
  }

  /**
   * Log user action for analytics/debugging
   */
  userAction(action: string, details?: Record<string, any>): void {
    this.info(`User action: ${action}`, {
      type: 'user_action',
      action,
      ...details,
    })
  }

  /**
   * Log API call
   */
  apiCall(method: string, endpoint: string, duration?: number, status?: number): void {
    const level = status && status >= 400 ? LogLevel.ERROR : LogLevel.INFO
    const entry = this.createLogEntry(
      level,
      `API ${method} ${endpoint}`,
      {
        type: 'api_call',
        method,
        endpoint,
        duration,
        status,
      }
    )
    this.log(entry)
  }

  /**
   * Log database query
   */
  dbQuery(operation: string, table: string, duration?: number): void {
    this.debug(`DB ${operation} on ${table}`, {
      type: 'db_query',
      operation,
      table,
      duration,
    })
  }

  /**
   * Log performance metric
   */
  performance(metric: string, value: number, unit: string = 'ms'): void {
    this.info(`Performance: ${metric}`, {
      type: 'performance',
      metric,
      value,
      unit,
    })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for testing
export { Logger }
