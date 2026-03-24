'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface UserBasic {
  id: string
  full_name: string | null
  email: string
  is_active: boolean
}

export function useUsers() {
  const [users, setUsers] = useState<UserBasic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const supabase = createClient() as any
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, is_active')
          .eq('is_active', true)
          .order('full_name')

        if (error) throw error
        setUsers(data || [])
        setError(null)
      } catch (err) {
        setError(err as Error)
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return { users, loading, error }
}
