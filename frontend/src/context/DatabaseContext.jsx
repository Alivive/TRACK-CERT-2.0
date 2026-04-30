import { createContext, useContext, useState, useCallback, useMemo } from 'react';
// Supabase removed - implement your own database solution
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

  const refreshData = useCallback(async () => {
    console.warn('[DB] Using mock database - implement your own backend');
    setLoading(false);
  }, []);

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
    console.warn('[DB] Using mock database - implement your own backend');
    return { error: new Error('Database not configured') };
  };

  const addCertification = async (cert) => {
    console.warn('[DB] Using mock database - implement your own backend');
    return { error: new Error('Database not configured') };
  };

  const deleteCertification = async (id) => {
    console.warn('[DB] Using mock database - implement your own backend');
    return { error: new Error('Database not configured') };
  };
  
  const updateProfileRole = async (userId, newRole) => {
    console.warn('[DB] Using mock database - implement your own backend');
    return { data: null, error: new Error('Database not configured') };
  };

  const updateProfile = async (userId, updates) => {
    console.warn('[DB] Using mock database - implement your own backend');
    return { data: null, error: new Error('Database not configured') };
  };

  const updateIntern = async (internId, updates) => {
    console.warn('[DB] Using mock database - implement your own backend');
    return { data: null, error: new Error('Database not configured') };
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
