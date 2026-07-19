'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

export interface Officer {
  id: string
  full_name: string | null
  email: string
}

/**
 * Active users with the `officer` role — candidates to assign to a board.
 * Two-step: officer ids from user_roles, then their profiles from public.users
 * (user_roles has no PostgREST relationship to public.users to embed).
 */
export function useOfficers() {
  return useQuery({
    queryKey: ['officers'],
    queryFn: async (): Promise<Officer[]> => {
      const supabase = createClient() as any
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'officer')
      if (rolesError) throw rolesError

      const ids = (roles || []).map((r: any) => r.user_id)
      if (ids.length === 0) return []

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', ids)
        .eq('is_active', true)
        .order('full_name')
      if (usersError) throw usersError
      return users || []
    },
    staleTime: 5 * 60 * 1000,
  })
}
