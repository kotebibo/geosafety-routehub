import { createClient } from '@/lib/supabase'

/**
 * Get inspector ID from user email
 * Maps Supabase Auth user to inspectors table record
 */
export async function getInspectorIdFromEmail(email: string | undefined): Promise<string | null> {
  if (!email) return null

  // Use any type for supabase to bypass strict table typings
  const supabase = createClient() as any

  try {
    const { data, error } = await supabase
      .from('inspectors')
      .select('id')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Error fetching inspector ID:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('Error in getInspectorIdFromEmail:', error)
    return null
  }
}

/**
 * Get inspector ID from user (convenience wrapper)
 */
export async function getInspectorId(user: { email?: string } | null): Promise<string | null> {
  return getInspectorIdFromEmail(user?.email)
}
