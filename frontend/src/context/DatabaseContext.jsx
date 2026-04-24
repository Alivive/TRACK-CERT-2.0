import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

const DatabaseContext = createContext({});

export const DatabaseProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [interns, setInterns] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!user || !profile) return;
    
    // Fetch logic based on role
    if (profile.role === 'admin') {
      const [ { data: iData }, { data: cData } ] = await Promise.all([
        supabase.from('interns').select('*').order('first_name'),
        supabase.from('certifications').select('*').order('date', { ascending: false })
      ]);
      if (iData) setInterns(iData);
      if (cData) setCertifications(cData);
    } else {
      // Standard interns only need their own certifications
      const { data: cData } = await supabase.from('certifications')
        .select('*')
        .order('date', { ascending: false }); // RLS handles the filtering securely
        
      if (cData) setCertifications(cData);
      // We don't need to load the interns list for standard users
      setInterns([]);
    }
    
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    if (user && profile) {
      refreshData();
      
      // Set up real-time listener based on role
      let channel;
      if (profile.role === 'admin') {
        channel = supabase.channel('db-changes-admin')
          .on('postgres_changes', { event: '*', table: 'interns' }, () => refreshData())
          .on('postgres_changes', { event: '*', table: 'certifications' }, () => refreshData())
          .subscribe();
      } else if (profile.intern_id) {
        // Interns only listen to their own certs
        channel = supabase.channel('db-changes-intern')
          .on('postgres_changes', { event: '*', table: 'certifications', filter: `intern_id=eq.${profile.intern_id}` }, () => refreshData())
          .subscribe();
      }

      return () => { if (channel) supabase.removeChannel(channel); };
    } else {
      setInterns([]);
      setCertifications([]);
      setLoading(false);
    }
  }, [user, profile, refreshData]);

  const addIntern = async (intern) => {
    return await supabase.from('interns').insert([intern]).select();
  };

  const addCertification = async (cert) => {
    return await supabase.from('certifications').insert([cert]).select();
  };

  const deleteCertification = async (id) => {
    return await supabase.from('certifications').delete().eq('id', id);
  };

  return (
    <DatabaseContext.Provider value={{ 
      interns, 
      certifications, 
      loading, 
      refreshData, 
      addIntern, 
      addCertification, 
      deleteCertification 
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);
