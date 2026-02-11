import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { queryKeys } from '@/lib/react-query'

/**
 * Hook to get inspector ID for the current authenticated user.
 * Uses user_roles table (canonical mapping) first, falls back to email lookup.
 */
export function useInspectorId(userEmail: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: [...queryKeys.routes.all, 'inspector-id', userEmail],
    queryFn: async () => {
      if (!userEmail) return null

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null

      // Primary: look up via user_roles (canonical user → inspector mapping)
      const { data: roleData } = await (supabase
        .from('user_roles') as any)
        .select('inspector_id')
        .eq('user_id', session.user.id)
        .single()

      if (roleData?.inspector_id) return roleData.inspector_id as string

      // Fallback: look up by email in inspectors table
      const { data, error } = await (supabase
        .from('inspectors') as any)
        .select('id')
        .eq('email', userEmail)
        .single()

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Error fetching inspector ID:', error)
        }
        return null
      }

      return (data as { id: string } | null)?.id || null
    },
    enabled: !!userEmail,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
