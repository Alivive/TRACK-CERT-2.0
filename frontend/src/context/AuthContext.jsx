import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Define functions before useEffect to ensure they exist for children
  const signIn = useCallback(async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = '/';
  }, []);

  const fetchProfile = useCallback(async (currentUser) => {
    if (!currentUser) return;

    // 1. Set preliminary profile from metadata
    const preliminaryProfile = {
      id: currentUser.id,
      full_name: currentUser.user_metadata?.full_name || 'User',
      role: currentUser.user_metadata?.role || 'intern'
    };
    setProfile(preliminaryProfile);

    try {
      // 2. Fetch real data from DB
      const [ { data: profileData }, { data: internData } ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id),
        supabase.from('interns').select('id').eq('auth_id', currentUser.id)
      ]);
      
      let userProfile = { ...preliminaryProfile };

      if (profileData && profileData.length > 0) {
        userProfile = { ...userProfile, ...profileData[0] };
      } else {
        // Background seeding
        const { error } = await supabase.from('profiles').upsert([userProfile], { onConflict: 'id' });
        if (error) console.error('[AUTH] Profile sync error:', error.message);
      }

      if (userProfile.role === 'intern') {
        if (internData && internData.length > 0) {
          userProfile.intern_id = internData[0].id;
        } else {
          // Link or create intern record
          const parts = userProfile.full_name.trim().split(' ');
          await supabase.from('interns').upsert([{
            auth_id: currentUser.id,
            first_name: parts[0] || userProfile.full_name,
            last_name: parts.slice(1).join(' ') || '-',
            email: currentUser.email,
            start_date: new Date().toISOString().split('T')[0]
          }], { onConflict: 'auth_id' });
          
          const { data: newIntern } = await supabase.from('interns').select('id').eq('auth_id', currentUser.id);
          if (newIntern && newIntern.length > 0) userProfile.intern_id = newIntern[0].id;
        }
      }

      setProfile(userProfile);
    } catch (err) {
      console.warn('[AUTH] Profile background sync delayed:', err.message);
    }
  }, []);

  const signUp = useCallback(async (email, password, fullName, role = 'intern') => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } }
    });

    if (!result.error && result.data?.user) {
      const userId = result.data.user.id;
      // Pre-seed profile
      await supabase.from('profiles').upsert([{ id: userId, full_name: fullName, role }]);
    }
    return result;
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          const u = session?.user ?? null;
          setUser(u);
          if (u) await fetchProfile(u);
        }
      } catch (e) {
        console.error('[AUTH] Init error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (!mounted) return;

      const u = session?.user ?? null;
      setUser(u);

      if (event === 'SIGNED_IN' && u) {
        await fetchProfile(u);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined || Object.keys(context).length === 0) {
    console.error('[AUTH] useAuth used outside AuthProvider!');
  }
  return context;
};
