'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface UserRole {
  role: 'admin' | 'dispatcher' | 'officer' | string // Allow custom roles
  inspector_id?: string
  permissions?: string[] // For custom role permissions
}

interface AuthContextType {
  user: User | null
  userRole: UserRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  isAdmin: boolean
  isDispatcher: boolean
  isOfficer: boolean
  hasPermission: (permission: string) => boolean
  refreshUserRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserRole(session.user.id, false)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const previousUser = user
      setUser(session?.user ?? null)
      if (session?.user) {
        // Only upsert profile on fresh sign-in, not on token refresh
        fetchUserRole(session.user.id, _event === 'SIGNED_IN')
      } else {
        setUserRole(null)
        setLoading(false)
        // Session expired — user was logged in before but now isn't
        if (previousUser && _event === 'SIGNED_OUT') {
          // Show a brief message before redirect (RouteGuard handles the redirect)
          sessionStorage.setItem('routehub-session-expired', '1')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (userId: string, isNewSession = false) => {
    try {
      // Fetch role + permissions in parallel (not sequentially)
      const { data: roleData, error: roleError } = await (supabase as any)
        .from('user_roles')
        .select('role, inspector_id')
        .eq('user_id', userId)
        .single()

      if (roleError) {
        console.warn('No role found for user:', roleError.message)
        setUserRole(null)
        setLoading(false)
        return
      }

      const role = roleData?.role as string
      const inspectorId = roleData?.inspector_id as string | undefined

      // Admin has wildcard - no need to fetch from DB
      let permissions: string[] = []
      if (role === 'admin') {
        permissions = ['*']
      } else {
        const { data: permData } = await (supabase as any)
          .from('role_permissions')
          .select('permission')
          .eq('role_name', role)

        if (permData) {
          permissions = permData.map((p: { permission: string }) => p.permission)
        }
      }

      setUserRole({
        role,
        inspector_id: inspectorId,
        permissions,
      })

      // Upsert profile in background — NOT blocking auth resolution
      if (isNewSession) {
        const currentUser = (await supabase.auth.getUser()).data.user
        if (currentUser?.email) {
          ;(supabase as any)
            .rpc('upsert_user_profile', {
              p_user_id: currentUser.id,
              p_user_email: currentUser.email,
              p_user_full_name: currentUser.user_metadata?.full_name || '',
              p_user_avatar_url: currentUser.user_metadata?.avatar_url || '',
            })
            .then(({ error }: { error: any }) => {
              if (error) console.warn('Failed to upsert user profile:', error.message)
            })
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      console.error('Error fetching user role:', error)
      setUserRole(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshUserRole = async () => {
    if (user) {
      await fetchUserRole(user.id)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        },
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    queryClient.clear()
    setUser(null)
    setUserRole(null)
  }

  const hasPermission = (permission: string): boolean => {
    if (!userRole?.permissions) return false

    // Admin has all permissions
    if (userRole.permissions.includes('*')) return true

    // Check exact permission match
    if (userRole.permissions.includes(permission)) return true

    // Check wildcard permissions (e.g., 'routes:*' matches 'routes:create')
    const [resource, action] = permission.split(':')
    if (userRole.permissions.includes(`${resource}:*`)) return true

    return false
  }

  const value = {
    user,
    userRole,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    isAdmin: userRole?.role === 'admin',
    isDispatcher: userRole?.role === 'dispatcher',
    isOfficer: userRole?.role === 'officer',
    hasPermission,
    refreshUserRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
