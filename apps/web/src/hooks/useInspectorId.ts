import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { queryKeys } from '@/lib/react-query'

/**
 * Hook to get inspector ID from user email
 * Maps Supabase Auth user to inspectors table record
 */
export function useInspectorId(userEmail: string | undefined) {
  // Create supabase client for this hook
  const supabase = createClient()

  return useQuery({
    queryKey: [...queryKeys.routes.all, 'inspector-id', userEmail],
    queryFn: async () => {
      if (!userEmail) return null

      // Verify we have an active session before querying
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // No session - user not authenticated yet
        return null
      }

      const { data, error } = await (supabase
        .from('inspectors') as any)
        .select('id')
        .eq('email', userEmail)
        .single()

      if (error) {
        // PGRST116 means no rows found - this is expected for users without inspector records
        if (error.code !== 'PGRST116') {
          console.error('Error fetching inspector ID:', error)
        }
        return null
      }

      return (data as { id: string } | null)?.id || null
    },
    enabled: !!userEmail,
    staleTime: Infinity, // Inspector ID won't change
    gcTime: Infinity, // React Query v5 renamed cacheTime to gcTime
  })
}
