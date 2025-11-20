'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserRole {
  role: 'admin' | 'dispatcher' | 'inspector';
  inspector_id?: string;
}

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isDispatcher: boolean;
  isInspector: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // TEMPORARY: Mock user for development - REMOVE IN PRODUCTION
  const [user, setUser] = useState<User | null>({
    id: 'dev-admin-user',
    email: 'dev@geosafety.ge',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: { full_name: 'Development Admin' },
  } as User);
  
  const [userRole, setUserRole] = useState<UserRole | null>({ 
    role: 'admin',
    inspector_id: undefined 
  });
  
  const [loading, setLoading] = useState(false); // Set to false since we're mocking

  useEffect(() => {
    // DISABLED: Authentication bypassed for development
    console.log('⚠️ AUTH DISABLED - Using mock admin user for development');
    setLoading(false);
    
    // Original code (commented out):
    /*
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
    */
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, inspector_id')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserRole(data);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    // DISABLED: Mock sign in - always succeeds
    console.log('⚠️ Mock sign in - authentication bypassed');
    return { error: null };
    
    // Original code (commented out):
    /*
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
    */
  };

  const signUp = async (email: string, password: string) => {
    // DISABLED: Mock sign up - always succeeds
    console.log('⚠️ Mock sign up - authentication bypassed');
    return { error: null };
    
    // Original code (commented out):
    /*
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
    */
  };

  const signOut = async () => {
    // DISABLED: Mock sign out
    console.log('⚠️ Mock sign out - authentication bypassed');
    
    // Original code (commented out):
    /*
    await supabase.auth.signOut();
    */
  };

  const value = {
    user,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: userRole?.role === 'admin',
    isDispatcher: userRole?.role === 'dispatcher',
    isInspector: userRole?.role === 'inspector',
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
