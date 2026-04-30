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
      
      // Use direct fetch instead of Supabase client
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );

      console.log('[AUTH] Fetch response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[AUTH] Fetch data:', data);

      if (!data || data.length === 0) {
        throw new Error('Profile not found');
      }

      console.log('[AUTH] Profile fetched successfully:', data[0].full_name);
      setProfile(data[0]);
      setLoading(false);
    } catch (error) {
      console.error('[AUTH] Profile fetch exception:', error);
      // Sign out on any error
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setProfile(null);
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
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      window.location.href = '/';
    } catch (error) {
      console.error('[AUTH] Sign out error:', error);
    } finally {
      setLoading(false);
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
        // Create user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email,
            full_name: fullName,
            role,
          })
          .select()
          .single();

        if (profileError) {
          console.error('[AUTH] Profile creation error:', profileError);
          // Don't return error - profile can be created later
        } else {
          setProfile(profileData);
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
