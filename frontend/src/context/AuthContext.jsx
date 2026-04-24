import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const currentUser = session?.user ?? null;
        
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            await fetchProfile(currentUser);
          } else {
            setProfile(null);
          }
        }
      } catch (e) {
        console.error('[AUTH] Initialization Error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignore INITIAL_SESSION as it's handled by initializeAuth
      if (event === 'INITIAL_SESSION') return;
      
      const currentUser = session?.user ?? null;
      if (mounted) {
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser);
        } else {
          setProfile(null);
        }
        
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (currentUser) => {
    try {
      // Fetch profile and intern data in parallel for maximum speed
      const [ { data: profileData }, { data: internData } ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id),
        supabase.from('interns').select('id').eq('auth_id', currentUser.id)
      ]);
      
      let userProfile = null;
      if (profileData && profileData.length > 0) {
        userProfile = profileData[0];
      } else {
        userProfile = {
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || 'User',
          role: currentUser.user_metadata?.role || 'intern'
        };
      }

      if (userProfile.role !== 'admin' && internData && internData.length > 0) {
        userProfile.intern_id = internData[0].id;
      }

      setProfile(userProfile);
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
