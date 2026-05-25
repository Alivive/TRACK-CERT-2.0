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
      setLoading(true);
      
      // Try to get cached profile FIRST for instant load
      const { offlineManager } = await import('../utils/offlineManager');
      const cachedProfile = await offlineManager.getCachedData(`profile_${userId}`);
      
      if (cachedProfile && cachedProfile.id === userId) {
        console.log('[AUTH] Using cached profile:', cachedProfile.full_name);
        setProfile(cachedProfile);
        setLoading(false);
      }
      
      // Then try to fetch fresh data from backend if online
      if (navigator.onLine) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/users/${userId}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
              }
            }
          );

          console.log('[AUTH] Backend response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('[AUTH] Backend response:', data);

            if (data.success && data.data && data.data.id === userId) {
              console.log('[AUTH] Profile fetched successfully:', data.data.full_name, 'Role:', data.data.role, 'Intern ID:', data.data.intern_id);
              setProfile(data.data);
              
              // Cache the fresh profile
              await offlineManager.cacheForOffline(`profile_${userId}`, data.data);
              setLoading(false);
              return;
            }
          }
        } catch (fetchError) {
          console.warn('[AUTH] Backend fetch failed:', fetchError.message);
          // If we have cached profile, continue using it
          if (cachedProfile && cachedProfile.id === userId) {
            console.log('[AUTH] Continuing with cached profile after fetch error');
            setLoading(false);
            return;
          }
        }
      } else {
        // Offline mode - use cached profile
        console.log('[AUTH] Offline mode - using cached profile');
        if (cachedProfile && cachedProfile.id === userId) {
          setLoading(false);
          return;
        }
      }
      
      // If we get here and don't have a profile, something is wrong
      if (!cachedProfile || cachedProfile.id !== userId) {
        console.error('[AUTH] No valid profile found (online or cached)');
        setProfile(null);
      }
    } catch (error) {
      console.error('[AUTH] Profile fetch exception:', error);
      
      // Last resort: try cached data
      try {
        const { offlineManager } = await import('../utils/offlineManager');
        const cachedProfile = await offlineManager.getCachedData(`profile_${userId}`);
        if (cachedProfile && cachedProfile.id === userId) {
          console.log('[AUTH] Using cached profile after exception:', cachedProfile.full_name);
          setProfile(cachedProfile);
        } else {
          setProfile(null);
        }
      } catch (cacheError) {
        console.error('[AUTH] Cache fallback failed:', cacheError);
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Add timeout for session check (3 seconds)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 3000)
        );
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (error) throw error;
        
        if (session?.user) {
          console.log('[AUTH] Active session found');
          setUser(session.user);
          
          // Cache session for offline use
          try {
            const { offlineManager } = await import('../utils/offlineManager');
            await offlineManager.cacheForOffline('auth_session', session);
          } catch (cacheError) {
            console.error('[AUTH] Failed to cache session:', cacheError);
          }
          
          await fetchProfile(session.user.id);
        } else {
          if (navigator.onLine) {
            console.log('[AUTH] No active session');
            setUser(null);
            setProfile(null);
            setLoading(false);
          } else {
            // No active session - check cache only for offline mode
            console.log('[AUTH] No active session, checking offline cache');
            await loadCachedSession();
          }
        }
      } catch (error) {
        console.error('[AUTH] Session check error:', error.message);
        
        // If we're offline or there's an error, try cached session
        console.log('[AUTH] Attempting to load cached session');
        await loadCachedSession();
      }
    };

    const loadCachedSession = async () => {
      try {
        const { offlineManager } = await import('../utils/offlineManager');
        const cachedSession = await offlineManager.getCachedData('auth_session');
        
        if (cachedSession && cachedSession.user) {
          console.log('[AUTH] Using cached session for offline mode:', cachedSession.user.email);
          setUser(cachedSession.user);
          await fetchProfile(cachedSession.user.id);
        } else {
          console.log('[AUTH] No cached session found');
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (cacheError) {
        console.error('[AUTH] Failed to load cached session:', cacheError);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes (only works when online)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] Auth state changed:', event);
      
      setLoading(true);
      
      // Cache the session for offline use
      if (session) {
        try {
          const { offlineManager } = await import('../utils/offlineManager');
          await offlineManager.cacheForOffline('auth_session', session);
        } catch (cacheError) {
          console.error('[AUTH] Failed to cache session:', cacheError);
        }
      }
      
      // SECURITY FIX: Clear previous user's cache when auth state changes
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        console.log('[AUTH] Clearing all cached data on sign out');
        try {
          const { offlineStorage } = await import('../utils/offlineStorage');
          await offlineStorage.clearAllCache();
        } catch (cacheError) {
          console.error('[AUTH] Failed to clear cache on sign out:', cacheError);
        }
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Clear any stale cache before loading new user
        const { offlineStorage } = await import('../utils/offlineStorage');
        await offlineStorage.clearAllCache();
        
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    try {
      console.log('[AUTH] Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), // Normalize email
        password,
      });

      if (error) {
        console.error('[AUTH] Sign in error:', error.message);
        return { error };
      }

      console.log('[AUTH] Authentication successful, fetching profile...');
      setUser(data.user);
      
      // Fetch profile with retry logic
      let retries = 3;
      let profileFetched = false;
      
      while (retries > 0 && !profileFetched) {
        try {
          await fetchProfile(data.user.id);
          profileFetched = true;
          console.log('[AUTH] Profile fetched successfully');
        } catch (profileError) {
          retries--;
          console.warn(`[AUTH] Profile fetch failed, retries left: ${retries}`, profileError);
          
          if (retries > 0) {
            // Wait 1 second before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.error('[AUTH] Profile fetch failed after all retries');
            // Don't fail login, user can still access with limited profile
          }
        }
      }
      
      return { data };
    } catch (error) {
      console.error('[AUTH] Sign in exception:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    console.log('[AUTH] Starting sign out process...');
    setLoading(true);
    
    try {
      // SECURITY FIX: Clear IndexedDB before signing out
      const { offlineStorage } = await import('../utils/offlineStorage');
      console.log('[AUTH] Clearing IndexedDB cache...');
      await offlineStorage.clearAllCache();
      
      // Clear Supabase session
      await supabase.auth.signOut();
      
      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear state immediately
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      console.log('[AUTH] Sign out successful');
      
    } catch (error) {
      console.error('[AUTH] Sign out error:', error);
      
      // Force clear even if operations fail
      try {
        const { offlineStorage } = await import('../utils/offlineStorage');
        await offlineStorage.clearAllCache();
      } catch (cacheError) {
        console.error('[AUTH] Failed to clear cache:', cacheError);
      }
      
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setProfile(null);
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
      const normalizedEmail = email.trim().toLowerCase();
      console.log('[AUTH] Attempting sign up for:', normalizedEmail);
      
      // Create auth user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          }
        }
      });

      if (authError) {
        console.error('[AUTH] Sign up error:', authError.message);
        return { error: authError };
      }

      // Only create profile if user was created (not if email confirmation required)
      if (authData.user) {
        console.log('[AUTH] User created, creating profile...');
        
        // Create user profile via backend API
        try {
          const profileResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: authData.user.id,
              email: normalizedEmail,
              full_name: fullName,
              role,
            })
          });

          const profileResult = await profileResponse.json();
          
          if (profileResult.success) {
            console.log('[AUTH] Profile created successfully');
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
      console.error('[AUTH] Sign up exception:', error);
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
