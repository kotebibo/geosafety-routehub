import { supabase } from '@/lib/supabase/client'

export const authService = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  getUserRole: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, inspector_id')
      .eq('user_id', userId)
      .single()
    
    if (error) throw error
    return data
  },
}
