/**
 * Server-side Supabase Client
 *
 * Creates a Supabase client for use in API routes and server components
 * Uses cookies for authentication
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Session-based client — uses the user's JWT from cookies.
 * RLS policies are enforced. Use this for all standard API operations.
 */
export function createServerClient() {
  const cookieStore = cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'routehub-auth',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll is called from Server Components where cookies cannot be set.
            // This can be ignored if the middleware is refreshing sessions.
          }
        },
      },
    }
  )
}

/**
 * Service role client — bypasses RLS. Only use for operations that genuinely
 * require elevated privileges (e.g., cross-user board sync, admin batch ops).
 * NEVER use for standard CRUD where the user's own permissions should apply.
 */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}
