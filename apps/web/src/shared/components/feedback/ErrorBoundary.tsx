/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the component tree,
 * logs those errors, and displays a fallback UI.
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/monitoring/logger'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    logger.error('Error boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
              რაღაც შეცდომა მოხდა
            </h2>
            
            <p className="text-center text-gray-600 mb-6">
              ვწუხვართ, მოხდა მოულოდნელი შეცდომა. გთხოვთ სცადოთ თავიდან.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg overflow-auto max-h-48">
                <p className="text-sm font-mono text-red-600 mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                თავიდან ცდა
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                მთავარ გვერდზე დაბრუნება
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Page-level error boundary with custom styling
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              რაღაც შეცდომა მოხდა
            </h1>
            <p className="text-gray-600 mb-6">
              გვერდის ჩატვირთვისას მოხდა შეცდომა
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              თავიდან ცდა
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Component-level error boundary (smaller fallback)
 */
export function ComponentErrorBoundary({ 
  children,
  componentName 
}: { 
  children: ReactNode
  componentName?: string 
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium mb-2">
            {componentName ? `${componentName} - შეცდომა` : 'კომპონენტის შეცდომა'}
          </p>
          <p className="text-red-600 text-sm">
            ამ კომპონენტის ჩატვირთვა ვერ მოხერხდა. გთხოვთ განაახლოთ გვერდი.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
