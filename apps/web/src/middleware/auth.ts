/**
 * Authentication Middleware
 * 
 * Provides authentication and authorization functions for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Custom error classes
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Get the current session from the request
 */
export async function getSession() {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw new UnauthorizedError('Failed to get session')
  }

  return session
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const session = await getSession()
  
  if (!session) {
    throw new UnauthorizedError('Authentication required')
  }
  
  return session
}

/**
 * Get user role from database
 */
async function getUserRole(userId: string): Promise<string | null> {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.role
}

/**
 * Require specific role - throws if user doesn't have required role
 */
export async function requireRole(role: string | string[]) {
  const session = await requireAuth()
  const userRole = await getUserRole(session.user.id)

  if (!userRole) {
    throw new ForbiddenError('User role not found')
  }

  const requiredRoles = Array.isArray(role) ? role : [role]
  
  if (!requiredRoles.includes(userRole)) {
    throw new ForbiddenError(`Required role: ${requiredRoles.join(' or ')}. Your role: ${userRole}`)
  }

  return { session, userRole }
}

/**
 * Require admin role
 */
export async function requireAdmin() {
  return requireRole('admin')
}

/**
 * Require admin or dispatcher role
 */
export async function requireAdminOrDispatcher() {
  return requireRole(['admin', 'dispatcher'])
}

/**
 * Require inspector role
 */
export async function requireInspector() {
  return requireRole('inspector')
}

/**
 * Error handler wrapper for API routes
 */
export function withAuth(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    requireRole?: string | string[]
  }
) {
  return async (req: NextRequest) => {
    try {
      // Check authentication
      if (options?.requireRole) {
        await requireRole(options.requireRole)
      } else {
        await requireAuth()
      }

      // Call the actual handler
      return await handler(req)
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        )
      }
      
      if (error instanceof ForbiddenError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        )
      }

      // Generic error
      console.error('API Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
