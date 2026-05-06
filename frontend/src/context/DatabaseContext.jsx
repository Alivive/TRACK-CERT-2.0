import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';
import { offlineManager } from '../utils/offlineManager';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabaseClient';

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

  // Real-time subscription for certifications (INSERT)
  useEffect(() => {
    if (!user) return;

    console.log('[DB] Setting up real-time subscription for certifications');
    
    const channel = supabase
      .channel('db-certifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'certifications'
        },
        (payload) => {
          console.log('[DB] New certification detected:', payload.new);
          const newCert = payload.new;
          
          setCertifications(prev => {
            // Check if already exists
            if (prev.some(c => c.id === newCert.id)) {
              return prev;
            }
            return [newCert, ...prev].sort((a, b) => 
              new Date(b.date || 0) - new Date(a.date || 0)
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'certifications'
        },
        (payload) => {
          console.log('[DB] Certification updated:', payload.new);
          const updatedCert = payload.new;
          
          setCertifications(prev => 
            prev.map(c => c.id === updatedCert.id ? updatedCert : c)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'certifications'
        },
        (payload) => {
          console.log('[DB] Certification deleted:', payload.old);
          const deletedId = payload.old.id;
          
          setCertifications(prev => prev.filter(c => c.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      console.log('[DB] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Real-time subscription for interns
  useEffect(() => {
    if (!user) return;

    console.log('[DB] Setting up real-time subscription for interns');
    
    const channel = supabase
      .channel('db-interns-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interns'
        },
        (payload) => {
          console.log('[DB] New intern detected:', payload.new);
          const newIntern = payload.new;
          
          setInterns(prev => {
            if (prev.some(i => i.id === newIntern.id)) {
              return prev;
            }
            return [...prev, newIntern].sort((a, b) => 
              (a.first_name || '').localeCompare(b.first_name || '')
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interns'
        },
        (payload) => {
          console.log('[DB] Intern updated:', payload.new);
          const updatedIntern = payload.new;
          
          setInterns(prev => 
            prev.map(i => i.id === updatedIntern.id ? updatedIntern : i)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'interns'
        },
        (payload) => {
          console.log('[DB] Intern deleted:', payload.old);
          const deletedId = payload.old.id;
          
          setInterns(prev => prev.filter(i => i.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Real-time subscription for users (admin only)
  useEffect(() => {
    if (!user || profile?.role !== 'admin') return;

    console.log('[DB] Setting up real-time subscription for users');
    
    const channel = supabase
      .channel('db-users-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          console.log('[DB] New user detected:', payload.new);
          const newUser = payload.new;
          
          setAllProfiles(prev => {
            if (prev.some(u => u.id === newUser.id)) {
              return prev;
            }
            return [...prev, newUser];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          console.log('[DB] User updated:', payload.new);
          const updatedUser = payload.new;
          
          setAllProfiles(prev => 
            prev.map(u => u.id === updatedUser.id ? updatedUser : u)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile?.role]);

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
      if (navigator.onLine) {
        // Online: Delete via API
        const response = await apiClient.deleteCertification(id);
        if (response.success) {
          setCertifications(prev => prev.filter(c => c.id !== id));
          return { data: true };
        }
        return { error: response.error };
      } else {
        // Offline: Mark for deletion and remove from local state
        setCertifications(prev => prev.filter(c => c.id !== id));
        // TODO: Queue for deletion when back online
        return { data: true };
      }
    } catch (error) {
      return { error };
    }
  };

  const updateCertification = async (id, updates) => {
    try {
      if (navigator.onLine) {
        // Online: Update via API
        const response = await apiClient.updateCertification(id, updates);
        if (response.success) {
          const data = response.data;
          setCertifications(prev => prev.map(c => 
            c.id === id ? data : c
          ));
          return { data, error: null };
        }
        return { data: null, error: response.error };
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
