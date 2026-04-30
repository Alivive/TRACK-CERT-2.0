import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(async (email, password) => {
    console.warn('[AUTH] Using mock auth - implement your own backend');
    return { error: new Error('Auth not configured - implement your own backend') };
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setProfile(null);
    setLoading(false);
    window.location.href = '/';
  }, []);

  const refreshProfile = useCallback(async () => {
    console.warn('[AUTH] Profile refresh not available - using mock client');
  }, []);

  const signUp = useCallback(async (email, password, fullName, role = 'intern') => {
    console.warn('[AUTH] Using mock auth - implement your own backend');
    return { error: new Error('Auth not configured - implement your own backend') };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined || Object.keys(context).length === 0) {
    console.error('[AUTH] useAuth used outside AuthProvider!');
  }
  return context;
};
