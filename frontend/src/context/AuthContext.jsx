import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    try {
      console.log('[AUTH] Fetching profile for user:', userId);
      
      // Use backend API instead of direct Supabase
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/${userId}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[AUTH] Backend response status:', response.status);
      
      const data = await response.json();
      console.log('[AUTH] Backend response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.data) {
        throw new Error('Profile not found');
      }

      console.log('[AUTH] Profile fetched successfully:', data.data.full_name);
      setProfile(data.data);
    } catch (error) {
      console.error('[AUTH] Profile fetch exception:', error);
      // Don't sign out on profile fetch error - just continue without profile
      setProfile(null);
    } finally {
      // ALWAYS set loading to false
      setLoading(false);
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('[AUTH] Session check error:', error);
        // If session check fails, sign out to clear corrupted state
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] Auth state changed:', event);
      
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      setUser(data.user);
      await fetchProfile(data.user.id);
      return { data };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    console.log('[AUTH] Starting sign out process...');
    setLoading(true);
    
    try {
      // Clear Supabase session
      await supabase.auth.signOut();
      
      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear state immediately
      setUser(null);
      setProfile(null);
      
      console.log('[AUTH] Sign out successful, redirecting...');
      
      // Force page reload to clear any cached state
      window.location.reload();
      
    } catch (error) {
      console.error('[AUTH] Sign out error:', error);
      
      // Force clear even if Supabase fails
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setProfile(null);
      window.location.reload();
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const signUp = useCallback(async (email, password, fullName, role = 'intern') => {
    setLoading(true);
    try {
      // Create auth user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          }
        }
      });

      if (authError) return { error: authError };

      // Only create profile if user was created (not if email confirmation required)
      if (authData.user) {
        // Create user profile via backend API
        try {
          const profileResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: authData.user.id,
              email,
              full_name: fullName,
              role,
            })
          });

          const profileResult = await profileResponse.json();
          
          if (profileResult.success) {
            setProfile(profileResult.data);
          } else {
            console.error('[AUTH] Profile creation error:', profileResult.error);
            // Don't return error - profile can be created later
          }
        } catch (profileError) {
          console.error('[AUTH] Profile creation error:', profileError);
          // Don't return error - profile can be created later
        }

        // If session exists, set user
        if (authData.session) {
          setUser(authData.user);
        }
      }

      return { data: authData };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('[AUTH] useAuth used outside AuthProvider!');
    return { user: null, profile: null, loading: false, signIn: async () => {}, signUp: async () => {}, signOut: async () => {}, refreshProfile: async () => {} };
  }
  return context;
};
