'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserRole {
  role: 'admin' | 'dispatcher' | 'inspector' | string; // Allow custom roles
  inspector_id?: string;
  permissions?: string[]; // For custom role permissions
}

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isDispatcher: boolean;
  isInspector: boolean;
  hasPermission: (permission: string) => boolean;
  refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // Ensure user profile exists in users table
      // This replaces the auth.users trigger we can't create
      // The function also triggers creation of default workspace via trigger on users table
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (currentUser && currentUser.email) {
        try {
          const { error: rpcError } = await (supabase as any).rpc('upsert_user_profile', {
            p_user_id: currentUser.id,
            p_user_email: currentUser.email,
            p_user_full_name: currentUser.user_metadata?.full_name || '',
            p_user_avatar_url: currentUser.user_metadata?.avatar_url || '',
          });
          if (rpcError) {
            console.warn('Failed to upsert user profile:', rpcError.message);
          }
        } catch (err) {
          // Log but don't fail - user can still proceed, workspace might not be created
          console.warn('Failed to upsert user profile:', err);
        }
      }

      // First, get the user's role
      const { data: roleData, error: roleError } = await (supabase as any)
        .from('user_roles')
        .select('role, inspector_id')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        // User might not have a role assigned yet
        console.warn('No role found for user:', roleError.message);
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Check if it's a custom role and fetch permissions
      let permissions: string[] = [];

      const role = roleData?.role as string;
      const inspectorId = roleData?.inspector_id as string | undefined;

      // For built-in roles, assign default permissions
      if (role === 'admin') {
        permissions = ['*']; // Admin has all permissions
      } else if (role === 'dispatcher') {
        permissions = [
          'users:read',
          'routes:read', 'routes:create', 'routes:update',
          'companies:read', 'companies:create', 'companies:update',
          'inspectors:read',
          'inspections:read', 'inspections:create', 'inspections:update',
          'boards:read', 'boards:create', 'boards:update',
        ];
      } else if (role === 'inspector') {
        permissions = [
          'routes:read',
          'companies:read',
          'inspections:read', 'inspections:create', 'inspections:update:own',
          'boards:read',
        ];
      } else {
        // Custom role - fetch permissions from role_permissions table
        const { data: permData } = await (supabase as any)
          .from('role_permissions')
          .select('permission')
          .eq('role_name', role);

        if (permData) {
          permissions = permData.map((p: { permission: string }) => p.permission);
        }
      }

      setUserRole({
        role,
        inspector_id: inspectorId,
        permissions,
      });
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserRole = async () => {
    if (user) {
      await fetchUserRole(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!userRole?.permissions) return false;

    // Admin has all permissions
    if (userRole.permissions.includes('*')) return true;

    // Check exact permission match
    if (userRole.permissions.includes(permission)) return true;

    // Check wildcard permissions (e.g., 'routes:*' matches 'routes:create')
    const [resource, action] = permission.split(':');
    if (userRole.permissions.includes(`${resource}:*`)) return true;

    return false;
  };

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
    isInspector: userRole?.role === 'inspector',
    hasPermission,
    refreshUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
