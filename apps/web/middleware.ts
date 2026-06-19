import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimitMiddleware } from '@/middleware/rateLimit'

// Paths that don't need auth session refresh
const PUBLIC_PATHS = ['/auth/', '/api/cron/', '/api/health', '/manifest.json', '/sw.js']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth refresh for public/static paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    const response = NextResponse.next({ request: { headers: request.headers } })
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    return response
  }

  // Apply rate limiting
  const rateLimitResponse = rateLimitMiddleware(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Create response to pass through
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Skip auth refresh if no auth cookie exists (user not logged in)
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.includes('routehub-auth'))
  if (!hasAuthCookie) {
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    return response
  }

  // Refresh Supabase auth session.
  // This keeps the JWT alive by exchanging the refresh token for a new
  // access token before it expires (default 1 hour).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'routehub-auth',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update cookies on the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          // Re-create response with updated request headers
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          // Set cookies on the response (sent back to browser)
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // getUser() triggers the token refresh when the access token is expired
  // but the refresh token is still valid
  await supabase.auth.getUser()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  // CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL
    if (allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
