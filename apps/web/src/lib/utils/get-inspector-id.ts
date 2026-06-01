import { createClient } from '@/lib/supabase'

/**
 * Get user ID from current session.
 * Previously mapped email → inspectors table. Now returns auth user ID directly.
 * @deprecated Use user.id from auth session instead
 */
export async function getInspectorIdFromEmail(email: string | undefined): Promise<string | null> {
  if (!email) return null

  const supabase = createClient()

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.user?.id || null
  } catch (error) {
    console.error('Error in getInspectorIdFromEmail:', error)
    return null
  }
}

/**
 * @deprecated Use user.id from auth session instead
 */
export async function getInspectorId(user: { email?: string } | null): Promise<string | null> {
  return getInspectorIdFromEmail(user?.email)
}
