import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';
import { offlineManager } from '../utils/offlineManager';
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
    
    // SECURITY FIX: Use user-specific cache keys to prevent data leakage
    const userCacheKey = (key) => `${user.id}_${key}`;
    
    // OPTIMIZATION: Load cached data FIRST for instant display
    try {
      const cachedInterns = await offlineManager.getCachedData(userCacheKey('interns'));
      if (cachedInterns && cachedInterns.length > 0) {
        setInterns(cachedInterns);
      }

      const cachedCerts = await offlineManager.getCachedData(userCacheKey('certifications'));
      if (cachedCerts && cachedCerts.length > 0) {
        setCertifications(cachedCerts);
      }

      if (profile?.role === 'admin') {
        const cachedUsers = await offlineManager.getCachedData(userCacheKey('users'));
        if (cachedUsers && cachedUsers.length > 0) {
          setAllProfiles(cachedUsers);
        }
      }
    } catch (cacheError) {
      console.warn('[DB] Could not load cached data:', cacheError);
    }
    
    // Then fetch fresh data in background if online
    if (navigator.onLine) {
      try {
        // Fetch all data in parallel for speed
        const [internsResponse, certsResponse, profilesResponse] = await Promise.all([
          apiClient.getInterns(),
          apiClient.getCertifications(),
          profile?.role === 'admin' ? apiClient.getUsers() : Promise.resolve({ success: false })
        ]);

        if (internsResponse.success) {
          setInterns(internsResponse.data || []);
          await offlineManager.cacheForOffline(userCacheKey('interns'), internsResponse.data);
        }

        if (certsResponse.success) {
          setCertifications(certsResponse.data || []);
          await offlineManager.cacheForOffline(userCacheKey('certifications'), certsResponse.data);
        }

        if (profile?.role === 'admin' && profilesResponse.success) {
          setAllProfiles(profilesResponse.data || []);
          await offlineManager.cacheForOffline(userCacheKey('users'), profilesResponse.data);
        }
      } catch (error) {
        console.error('[DB] Refresh data error:', error);
        // Cached data already loaded above, so UI still works
      }
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
      if (navigator.onLine) {
        // Online: Add via API
        const response = await apiClient.addCertification(cert);
        if (response.success) {
          const data = response.data;
          setCertifications(prev => [data, ...prev].sort((a, b) => 
            new Date(b.date || 0) - new Date(a.date || 0)
          ));
          return { data };
        }
        return { error: response.error };
      } else {
        // Offline: Store locally and queue for sync
        const result = await offlineManager.addCertificationOffline(cert);
        if (result.success) {
          // Add to local state with offline flag
          const offlineCert = {
            ...cert,
            id: result.id,
            offline: true,
            pending: true,
            timestamp: Date.now()
          };
          
          setCertifications(prev => [offlineCert, ...prev].sort((a, b) => 
            new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0)
          ));
          
          return { data: offlineCert };
        }
        return { error: result.error };
      }
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

  const updateCertification = async (id, updates) => {
    try {
      if (navigator.onLine) {
        // Online: Update via API (when backend supports it)
        // const response = await apiClient.updateCertification(id, updates);
        // For now, update locally
        setCertifications(prev => prev.map(c => 
          c.id === id ? { ...c, ...updates } : c
        ));
        return { data: { ...updates, id }, error: null };
      } else {
        // Offline: Update locally and queue for sync
        setCertifications(prev => prev.map(c => 
          c.id === id ? { ...c, ...updates, offline: true, pending: true } : c
        ));
        return { data: { ...updates, id }, error: null };
      }
    } catch (error) {
      return { data: null, error };
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
      updateCertification,
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
