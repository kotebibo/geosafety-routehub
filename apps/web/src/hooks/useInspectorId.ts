import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { queryKeys } from '@/lib/react-query'

/**
 * Hook to get the current user's ID for use as the actor in board operations.
 * Previously mapped user → inspector via DB lookup. Now returns auth user ID directly.
 */
export function useInspectorId(userEmail: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: [...queryKeys.routes.all, 'inspector-id', userEmail],
    queryFn: async () => {
      if (!userEmail) return null

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return null

      return session.user.id
    },
    enabled: !!userEmail,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
