import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';
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
      const internsResponse = await apiClient.getInterns();
      setInterns(internsResponse.data || []);

      // Fetch certifications
      const certsResponse = await apiClient.getCertifications();
      setCertifications(certsResponse.data || []);

      // Fetch all profiles (admin only)
      if (profile?.role === 'admin') {
        const profilesResponse = await apiClient.getUsers();
        setAllProfiles(profilesResponse.data || []);
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
      const response = await apiClient.addIntern(intern);
      const data = response.data;

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
      const response = await apiClient.addCertification(cert);
      const data = response.data;

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
      // Note: Backend doesn't have delete endpoint yet, keeping for future
      setCertifications(prev => prev.filter(c => c.id !== id));
      return { data: true };
    } catch (error) {
      return { error };
    }
  };
  
  const updateProfileRole = async (userId, newRole) => {
    try {
      const response = await apiClient.updateUser(userId, { role: newRole });
      const data = response.data;

      setAllProfiles(prev => prev.map(p => p.id === userId ? data : p));
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateProfile = async (userId, updates) => {
    try {
      const response = await apiClient.updateUser(userId, updates);
      const data = response.data;

      setAllProfiles(prev => prev.map(p => p.id === userId ? data : p));
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateIntern = async (internId, updates) => {
    try {
      // Note: Backend doesn't have update intern endpoint yet, keeping for future
      setInterns(prev => prev.map(i => i.id === internId ? { ...i, ...updates } : i));
      return { data: { ...updates, id: internId }, error: null };
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
