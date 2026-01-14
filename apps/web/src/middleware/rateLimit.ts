/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

import { NextRequest, NextResponse } from 'next/server'

// Store for rate limit tracking (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  message?: string
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100, // 100 requests
  windowMs: 15 * 60 * 1000, // per 15 minutes
  message: 'Too many requests, please try again later',
}

// Different limits for different endpoints
// More restrictive for write operations, relaxed for reads
const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints - very strict
  '/api/auth': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min

  // Route operations - moderate (computationally expensive)
  '/api/routes/optimize': { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  '/api/routes/save': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute

  // Admin operations - strict
  '/api/service-types': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  '/api/inspectors': { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute

  // Company operations - moderate
  '/api/companies': { maxRequests: 50, windowMs: 60 * 1000 }, // 50 per minute
  '/api/company-services': { maxRequests: 50, windowMs: 60 * 1000 }, // 50 per minute

  // Board operations - relaxed (frequent updates)
  '/api/boards': { maxRequests: 120, windowMs: 60 * 1000 }, // 120 per minute

  // Default for all other API routes
  '/api': { ...DEFAULT_CONFIG },
}

/**
 * Get client identifier (IP address or user ID)
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || real || 'unknown'
  
  // In production, also consider user ID if authenticated
  // const userId = await getUserIdFromToken(request)
  // return userId || ip
  
  return ip
}

/**
 * Clean up expired entries
 */
function cleanupStore(): void {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime <= now) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config?: Partial<RateLimitConfig>
): { allowed: boolean; remaining: number; resetTime: number } {
  // Get config for this endpoint
  const pathname = request.nextUrl.pathname
  const endpointConfig = Object.entries(ENDPOINT_LIMITS)
    .find(([path]) => pathname.startsWith(path))?.[1] || DEFAULT_CONFIG
  
  const finalConfig = { ...endpointConfig, ...config }
  const clientId = getClientId(request)
  const key = `${clientId}:${pathname}`
  const now = Date.now()
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) cleanupStore()
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key)
  
  if (!entry || entry.resetTime <= now) {
    entry = {
      count: 0,
      resetTime: now + finalConfig.windowMs,
    }
  }
  
  entry.count++
  rateLimitStore.set(key, entry)
  
  const allowed = entry.count <= finalConfig.maxRequests
  const remaining = Math.max(0, finalConfig.maxRequests - entry.count)
  
  return { allowed, remaining, resetTime: entry.resetTime }
}
/**
 * Rate limit middleware for Next.js
 */
export function rateLimitMiddleware(request: NextRequest): NextResponse | null {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return null
  }
  
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return null
  }
  
  const { allowed, remaining, resetTime } = checkRateLimit(request)
  
  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Please try again later',
        resetTime: new Date(resetTime).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
        },
      }
    )
  }
  
  return null
}

export default rateLimitMiddleware