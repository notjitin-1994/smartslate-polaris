// Client-side user management service
import { clientStorage, SecureStorage } from '@/lib/clientStorage';
import type { User } from '@supabase/supabase-js';

export interface ClientUser {
  id: string;
  email: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar_url?: string;
    username?: string;
  };
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  created_at: string;
  updated_at: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  job_title?: string;
  company?: string;
  website?: string;
  location?: string;
  country?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  user: ClientUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
}

class ClientUserService {
  private currentSession: UserSession | null = null;
  private sessionKey = 'smartslate:session';

  // Initialize and restore session
  async init(): Promise<void> {
    await clientStorage.init();
    this.restoreSession();
  }

  // Create new user account (client-side only)
  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<{ user: ClientUser; session: UserSession }> {
    const userId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? (crypto as any).randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    const now = new Date().toISOString();

    const user: ClientUser = {
      id: userId,
      email,
      user_metadata: {
        first_name: metadata?.first_name,
        last_name: metadata?.last_name,
        full_name: metadata?.full_name,
        avatar_url: metadata?.avatar_url,
        username: metadata?.username,
      },
      app_metadata: {
        provider: 'email',
        providers: ['email']
      },
      created_at: now,
      updated_at: now,
      email_confirmed_at: now, // Auto-confirm in client mode
    };

    // Create session
    const session: UserSession = {
      user,
      access_token: `client_token_${Date.now()}`,
      refresh_token: `client_refresh_${Date.now()}`,
      expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      token_type: 'bearer'
    };

    // Store user profile
    const profile: UserProfile = {
      id: userId,
      email,
      username: metadata?.username,
      full_name: metadata?.full_name,
      first_name: metadata?.first_name,
      last_name: metadata?.last_name,
      avatar_url: metadata?.avatar_url,
      job_title: metadata?.job_title,
      company: metadata?.company,
      website: metadata?.website,
      location: metadata?.location,
      country: metadata?.country,
      bio: metadata?.bio,
      created_at: now,
      updated_at: now
    };

    try {
      await clientStorage.put('profiles', profile);
      this.setSession(session);
      return { user, session };
    } catch (error: any) {
      // Handle race conditions where another tab/process created the same email concurrently
      if (this.isUniqueEmailConstraintError(error)) {
        const existing = (await clientStorage.query<UserProfile>('profiles', 'email', email))[0];
        if (!existing) throw error;

        const existingUser: ClientUser = {
          id: existing.id,
          email: existing.email,
          user_metadata: {
            first_name: existing.first_name,
            last_name: existing.last_name,
            full_name: existing.full_name,
            avatar_url: existing.avatar_url,
            username: existing.username,
          },
          app_metadata: {
            provider: 'email',
            providers: ['email']
          },
          created_at: existing.created_at,
          updated_at: existing.updated_at,
          email_confirmed_at: existing.created_at,
          last_sign_in_at: new Date().toISOString(),
        };

        const fallbackSession: UserSession = {
          user: existingUser,
          access_token: `client_token_${Date.now()}`,
          refresh_token: `client_refresh_${Date.now()}`,
          expires_at: Date.now() + (24 * 60 * 60 * 1000),
          token_type: 'bearer'
        };

        this.setSession(fallbackSession);
        return { user: existingUser, session: fallbackSession };
      }

      throw error;
    }
  }

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<{ user: ClientUser; session: UserSession }> {
    // In client-only mode, find user by email
    const profiles = await clientStorage.getAll<UserProfile>('profiles');
    const profile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());

    if (!profile) {
      throw new Error('User not found');
    }

    const user: ClientUser = {
      id: profile.id,
      email: profile.email,
      user_metadata: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        username: profile.username,
      },
      app_metadata: {
        provider: 'email',
        providers: ['email']
      },
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      email_confirmed_at: profile.created_at,
      last_sign_in_at: new Date().toISOString(),
    };

    const session: UserSession = {
      user,
      access_token: `client_token_${Date.now()}`,
      refresh_token: `client_refresh_${Date.now()}`,
      expires_at: Date.now() + (24 * 60 * 60 * 1000),
      token_type: 'bearer'
    };

    this.setSession(session);
    return { user, session };
  }

  // Sign out
  async signOut(): Promise<void> {
    this.currentSession = null;
    SecureStorage.remove(this.sessionKey);
    
    // Clear sensitive data but preserve user work
    SecureStorage.remove('auth_tokens');
    
    // Emit auth state change
    this.emitAuthChange(null);
  }

  // Get current session
  getSession(): UserSession | null {
    return this.currentSession;
  }

  // Get current user
  getUser(): ClientUser | null {
    return this.currentSession?.user || null;
  }

  // Update user metadata
  async updateUser(updates: Partial<ClientUser['user_metadata']>): Promise<ClientUser> {
    if (!this.currentSession) {
      throw new Error('Not authenticated');
    }

    const updatedUser = {
      ...this.currentSession.user,
      user_metadata: {
        ...this.currentSession.user.user_metadata,
        ...updates
      },
      updated_at: new Date().toISOString()
    };

    // Update profile in storage
    const profile = await clientStorage.get<UserProfile>('profiles', updatedUser.id);
    if (profile) {
      const updatedProfile = {
        ...profile,
        ...updates,
        updated_at: updatedUser.updated_at
      };
      await clientStorage.put('profiles', updatedProfile);
    }

    // Update session
    this.currentSession.user = updatedUser;
    this.setSession(this.currentSession);

    return updatedUser;
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return await clientStorage.get<UserProfile>('profiles', userId);
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await clientStorage.get<UserProfile>('profiles', userId);
    if (!existing) {
      throw new Error('Profile not found');
    }

    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    await clientStorage.put('profiles', updated);
    return updated;
  }

  // Session management
  private setSession(session: UserSession): void {
    this.currentSession = session;
    SecureStorage.set(this.sessionKey, session, true);
    this.emitAuthChange(session.user);
  }

  private restoreSession(): void {
    const session = SecureStorage.get<UserSession>(this.sessionKey, true);
    if (session && session.expires_at > Date.now()) {
      this.currentSession = session;
      this.emitAuthChange(session.user);
    } else if (session) {
      // Session expired
      SecureStorage.remove(this.sessionKey);
    }
  }

  // Auth state change events
  private authListeners = new Set<(user: ClientUser | null) => void>();

  onAuthStateChange(callback: (user: ClientUser | null) => void): () => void {
    this.authListeners.add(callback);
    
    // Call immediately with current state
    callback(this.getUser());

    // Return unsubscribe function
    return () => {
      this.authListeners.delete(callback);
    };
  }

  private emitAuthChange(user: ClientUser | null): void {
    this.authListeners.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  // OAuth simulation (Google, GitHub, etc.)
  async signInWithOAuth(provider: 'google' | 'github' | 'microsoft'): Promise<{ user: ClientUser; session: UserSession }> {
    // Simulate OAuth flow with mock data
    const mockUsers = {
      google: {
        email: 'user@gmail.com',
        first_name: 'Demo',
        last_name: 'User',
        full_name: 'Demo User',
        avatar_url: 'https://via.placeholder.com/150',
        username: 'demouser'
      },
      github: {
        email: 'user@github.com',
        first_name: 'GitHub',
        last_name: 'User',
        full_name: 'GitHub User',
        avatar_url: 'https://via.placeholder.com/150',
        username: 'githubuser'
      },
      microsoft: {
        email: 'user@outlook.com',
        first_name: 'Microsoft',
        last_name: 'User',
        full_name: 'Microsoft User',
        avatar_url: 'https://via.placeholder.com/150',
        username: 'msuser'
      }
    };

    const userData = mockUsers[provider];
    return this.signUp(userData.email, 'oauth_user', userData);
  }

  // Check if email exists
  async checkEmailExists(email: string): Promise<boolean> {
    const profiles = await clientStorage.query<UserProfile>('profiles', 'email', email);
    return profiles.length > 0;
  }

  // Password reset (client-side simulation)
  async resetPassword(email: string): Promise<void> {
    const exists = await this.checkEmailExists(email);
    if (!exists) {
      throw new Error('User not found');
    }
    
    // In a real implementation, this would send an email
    console.log(`Password reset email sent to ${email}`);
  }

  // Refresh session token
  async refreshSession(): Promise<UserSession> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const refreshedSession: UserSession = {
      ...this.currentSession,
      access_token: `client_token_${Date.now()}`,
      expires_at: Date.now() + (24 * 60 * 60 * 1000)
    };

    this.setSession(refreshedSession);
    return refreshedSession;
  }

  private isUniqueEmailConstraintError(error: any): boolean {
    const name = String(error?.name || '');
    const message = String(error?.message || '');
    return name === 'ConstraintError' || /index 'email'/.test(message) || /uniqueness/i.test(message);
  }
}

// Singleton instance
export const clientUserService = new ClientUserService();

// Initialize on module load
clientUserService.init();
