import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { queryKeys } from '@/lib/react-query'

/**
 * Hook to get inspector ID from user email
 * Maps Supabase Auth user to inspectors table record
 */
export function useInspectorId(userEmail: string | undefined) {
  // Use any type for supabase to bypass strict table typings
  const supabase = createClient() as any

  return useQuery({
    queryKey: [...queryKeys.routes.all, 'inspector-id', userEmail],
    queryFn: async () => {
      if (!userEmail) return null

      const { data, error } = await supabase
        .from('inspectors')
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

      return data?.id || null
    },
    enabled: !!userEmail,
    staleTime: Infinity, // Inspector ID won't change
    gcTime: Infinity, // React Query v5 renamed cacheTime to gcTime
  })
}
