import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

const DatabaseContext = createContext({});

export const DatabaseProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [interns, setInterns] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // O(1) Hash Map for instantly looking up interns by ID
  const internDict = useMemo(() => {
    return interns.reduce((dict, intern) => {
      dict[intern.id] = intern;
      return dict;
    }, {});
  }, [interns]);

  // Load data when user logs in
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch interns
      const { data: internsData, error: internsError } = await supabase
        .from('interns')
        .select('*')
        .order('first_name', { ascending: true });

      if (internsError) throw internsError;
      setInterns(internsData || []);

      // Fetch certifications
      const { data: certsData, error: certsError } = await supabase
        .from('certifications')
        .select('*')
        .order('date', { ascending: false });

      if (certsError) throw certsError;
      setCertifications(certsData || []);

      // Fetch all profiles (admin only)
      if (profile?.role === 'admin') {
        const { data: profilesData, error: profilesError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;
        setAllProfiles(profilesData || []);
      }
    } catch (error) {
      console.error('[DB] Refresh data error:', error);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const injectData = useCallback((table, newData) => {
    if (!newData) return;
    const items = Array.isArray(newData) ? newData : [newData];
    
    if (table === 'interns') {
      setInterns(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const uniqueNew = items.filter(i => !existingIds.has(i.id));
        return [...prev, ...uniqueNew].sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));
      });
    } else if (table === 'certifications') {
      setCertifications(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const uniqueNew = items.filter(c => !existingIds.has(c.id));
        return [...uniqueNew, ...prev].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      });
    }
  }, []);

  const addIntern = async (intern) => {
    try {
      const { data, error } = await supabase
        .from('interns')
        .insert(intern)
        .select()
        .single();

      if (error) return { error };

      setInterns(prev => [...prev, data].sort((a, b) => 
        (a.first_name || '').localeCompare(b.first_name || '')
      ));

      return { data };
    } catch (error) {
      return { error };
    }
  };

  const addCertification = async (cert) => {
    try {
      const { data, error } = await supabase
        .from('certifications')
        .insert(cert)
        .select()
        .single();

      if (error) return { error };

      setCertifications(prev => [data, ...prev].sort((a, b) => 
        new Date(b.date || 0) - new Date(a.date || 0)
      ));

      return { data };
    } catch (error) {
      return { error };
    }
  };

  const deleteCertification = async (id) => {
    try {
      const { error } = await supabase
        .from('certifications')
        .delete()
        .eq('id', id);

      if (error) return { error };

      setCertifications(prev => prev.filter(c => c.id !== id));
      return { data: true };
    } catch (error) {
      return { error };
    }
  };
  
  const updateProfileRole = async (userId, newRole) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single();

      if (error) return { data: null, error };

      setAllProfiles(prev => prev.map(p => p.id === userId ? data : p));
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateProfile = async (userId, updates) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) return { data: null, error };

      setAllProfiles(prev => prev.map(p => p.id === userId ? data : p));
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateIntern = async (internId, updates) => {
    try {
      const { data, error } = await supabase
        .from('interns')
        .update(updates)
        .eq('id', internId)
        .select()
        .single();

      if (error) return { data: null, error };

      setInterns(prev => prev.map(i => i.id === internId ? data : i));
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  return (
    <DatabaseContext.Provider value={{ 
      interns, 
      internDict,
      certifications, 
      loading, 
      refreshData, 
      addIntern, 
      addCertification, 
      deleteCertification,
      allProfiles,
      updateProfileRole,
      updateProfile,
      updateIntern
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDatabase = () => useContext(DatabaseContext);
