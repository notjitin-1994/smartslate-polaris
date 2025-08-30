// Client-side authentication context for production
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { clientUserService, type ClientUser, type UserSession } from '@/services/clientUserService';

interface AuthContextType {
  user: ClientUser | null;
  session: UserSession | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github' | 'microsoft') => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<ClientUser['user_metadata']>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize and restore session
    const initAuth = async () => {
      try {
        await clientUserService.init();
        const currentSession = clientUserService.getSession();
        const currentUser = clientUserService.getUser();
        
        setSession(currentSession);
        setUser(currentUser);
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const unsubscribe = clientUserService.onAuthStateChange((newUser) => {
      setUser(newUser);
      setSession(newUser ? clientUserService.getSession() : null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    setLoading(true);
    try {
      const { user: newUser, session: newSession } = await clientUserService.signUp(email, password, metadata);
      setUser(newUser);
      setSession(newSession);
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { user: existingUser, session: newSession } = await clientUserService.signIn(email, password);
      setUser(existingUser);
      setSession(newSession);
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github' | 'microsoft') => {
    setLoading(true);
    try {
      const { user: oauthUser, session: newSession } = await clientUserService.signInWithOAuth(provider);
      setUser(oauthUser);
      setSession(newSession);
    } catch (error) {
      console.error('OAuth sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await clientUserService.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updates: Partial<ClientUser['user_metadata']>) => {
    if (!user) throw new Error('Not authenticated');
    
    try {
      const updatedUser = await clientUserService.updateUser(updates);
      setUser(updatedUser);
    } catch (error) {
      console.error('User update failed:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await clientUserService.resetPassword(email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateUser,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useClientAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
}

// Compatibility hook for existing components
export function useAuth() {
  const clientAuth = useClientAuth();
  
  // Convert ClientUser to Supabase User format for compatibility
  const supabaseCompatibleUser = clientAuth.user ? {
    id: clientAuth.user.id,
    email: clientAuth.user.email,
    user_metadata: clientAuth.user.user_metadata,
    app_metadata: clientAuth.user.app_metadata,
    created_at: clientAuth.user.created_at,
    updated_at: clientAuth.user.updated_at,
    email_confirmed_at: clientAuth.user.email_confirmed_at,
    last_sign_in_at: clientAuth.user.last_sign_in_at,
  } : null;

  return {
    user: supabaseCompatibleUser,
    loading: clientAuth.loading,
    signOut: clientAuth.signOut,
  };
}
