import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

const DatabaseContext = createContext({});

export const DatabaseProvider = ({ children }) => {
  const { user } = useAuth();
  const [interns, setInterns] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!user) return;
    
    // Fetch both in parallel
    const [ { data: iData }, { data: cData } ] = await Promise.all([
      supabase.from('interns').select('*').order('first_name'),
      supabase.from('certifications').select('*').order('date', { ascending: false })
    ]);
    
    if (iData) setInterns(iData);
    if (cData) setCertifications(cData);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshData();
      
      // Set up real-time listener for instant UI updates
      const channel = supabase.channel('db-changes')
        .on('postgres_changes', { event: '*', table: 'interns' }, () => refreshData())
        .on('postgres_changes', { event: '*', table: 'certifications' }, () => refreshData())
        .subscribe();

      return () => supabase.removeChannel(channel);
    } else {
      setInterns([]);
      setCertifications([]);
      setLoading(false);
    }
  }, [user, refreshData]);

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
