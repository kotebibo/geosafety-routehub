import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { queryKeys } from '@/lib/react-query'

/**
 * Hook to get inspector ID from user email
 * Maps Supabase Auth user to inspectors table record
 */
export function useInspectorId(userEmail: string | undefined) {
  const supabase = createClient()

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
        console.error('Error fetching inspector ID:', error)
        return null
      }

      return data?.id || null
    },
    enabled: !!userEmail,
    staleTime: Infinity, // Inspector ID won't change
    cacheTime: Infinity,
  })
}
