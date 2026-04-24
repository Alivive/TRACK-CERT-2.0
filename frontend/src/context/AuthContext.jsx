import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Safety Valve: Force loading to false after 3 seconds if Supabase hangs
      const safetyValve = setTimeout(() => {
        console.warn('[AUTH] Safety Valve Triggered: Forcing initialization complete.');
        setLoading(false);
      }, 3000);

      try {
        console.log('[AUTH] Starting getSession...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[AUTH] getSession completed.', { hasSession: !!session, error });
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          console.log('[AUTH] Fetching profile for:', currentUser.id);
          await fetchProfile(currentUser);
          console.log('[AUTH] Profile fetch completed.');
        }
      } catch (e) {
        console.error('[AUTH] Initialization Error:', e);
      } finally {
        clearTimeout(safetyValve);
        setLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      if (event === 'SIGNED_IN') {
        // The "Flex" Delay: Show the premium loader for 1.5s after successful login
        setTimeout(() => setLoading(false), 1500);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (currentUser) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id);
      if (data && data.length > 0) {
        setProfile(data[0]);
      } else {
        setProfile({
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || 'User',
          role: currentUser.user_metadata?.role || 'intern'
        });
      }
    } catch (err) {
      console.error('[AUTH] Profile Fetch Error:', err);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setLoading(false);
    return result;
  };

  const signUp = async (email, password, fullName, role = 'intern') => {
    setLoading(true);
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } }
    });
    if (result.error) setLoading(false);
    return result;
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
