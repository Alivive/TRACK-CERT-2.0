import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

const DatabaseContext = createContext({});

export const DatabaseProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [interns, setInterns] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // O(1) Hash Map for instantly looking up interns by ID
  const internDict = React.useMemo(() => {
    return interns.reduce((dict, intern) => {
      dict[intern.id] = intern;
      return dict;
    }, {});
  }, [interns]);

  const refreshData = useCallback(async () => {
    if (!user || !profile) return;
    
    try {
      // Fetch logic based on role
      if (profile.role === 'admin') {
        const [internsRes, certsRes, profilesRes] = await Promise.all([
          supabase.from('interns').select('*').order('first_name'),
          supabase.from('certifications').select('*').order('date', { ascending: false }),
          supabase.from('profiles').select('*').order('full_name')
        ]);
        
        if (internsRes.data) setInterns(internsRes.data);
        if (certsRes.data) setCertifications(certsRes.data);
        if (profilesRes.data) setAllProfiles(profilesRes.data);
        
        if (internsRes.error) console.warn('[DB] Interns fetch error:', internsRes.error.message);
        if (certsRes.error) console.warn('[DB] Certs fetch error:', certsRes.error.message);
        if (profilesRes.error) console.warn('[DB] Profiles fetch error:', profilesRes.error.message);
      } else {
        // Standard interns only see their own certifications.
        const { data, error } = await supabase.from('certifications')
          .select('*')
          .eq('intern_id', profile.intern_id)
          .order('date', { ascending: false });
          
        if (data) setCertifications(data);
        if (error) console.warn('[DB] Certs fetch error:', error.message);
        
        setInterns([]);
      }
    } catch (err) {
      console.error('[DB] Refresh Data Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile) {
      refreshData();
      
      // Granular Real-Time Listener: Inject changes directly into local state
      // This prevents the "DDoS" effect of full-database refreshes
      let channel;
      if (profile.role === 'admin') {
        channel = supabase.channel('db-changes-admin')
          .on('postgres_changes', { event: 'INSERT', table: 'interns' }, (payload) => {
            setInterns(prev => [...prev, payload.new].sort((a, b) => a.first_name.localeCompare(b.first_name)));
          })
          .on('postgres_changes', { event: 'INSERT', table: 'certifications' }, (payload) => {
            setCertifications(prev => [payload.new, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
          })
          .on('postgres_changes', { event: 'DELETE', table: 'certifications' }, (payload) => {
            setCertifications(prev => prev.filter(c => c.id !== payload.old.id));
          })
          .subscribe();
      } else if (profile.intern_id) {
        // Interns only listen to their own certs
        channel = supabase.channel('db-changes-intern')
          .on('postgres_changes', { event: 'INSERT', table: 'certifications', filter: `intern_id=eq.${profile.intern_id}` }, (payload) => {
            setCertifications(prev => [payload.new, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
          })
          .on('postgres_changes', { event: 'DELETE', table: 'certifications', filter: `intern_id=eq.${profile.intern_id}` }, (payload) => {
            setCertifications(prev => prev.filter(c => c.id !== payload.old.id));
          })
          .subscribe();
      }

      return () => { if (channel) supabase.removeChannel(channel); };
    } else {
      setInterns([]);
      setCertifications([]);
      setLoading(false);
    }
  }, [user, profile, refreshData]);

  // Optimized State Injector: Merges new data while preventing duplicates
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
    const result = await supabase.from('interns').insert([intern]).select();
    if (result.data) injectData('interns', result.data);
    return result;
  };

  const addCertification = async (cert) => {
    const result = await supabase.from('certifications').insert([cert]).select();
    if (result.data) injectData('certifications', result.data);
    return result;
  };

  const deleteCertification = async (id) => {
    const result = await supabase.from('certifications').delete().eq('id', id);
    if (!result.error) {
      setCertifications(prev => prev.filter(c => c.id !== id));
    }
    return result;
  };
  
  const updateProfileRole = async (userId, newRole) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .select();
      
    if (!error && data) {
      setAllProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
    }
    return { data, error };
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
      updateProfileRole
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);
