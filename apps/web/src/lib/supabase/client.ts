// Re-export from main supabase file to avoid multiple client instances
import { getSupabase } from '@/lib/supabase'

// Export singleton client
export const supabase = getSupabase()
