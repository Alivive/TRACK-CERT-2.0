import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

const CategoriesContext = createContext({});

export const CategoriesProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/categories');
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('[CATEGORIES] Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (category) => {
    try {
      const response = await apiClient.post('/api/categories', category);
      if (response.success) {
        setCategories(prev => [...prev, response.data]);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateCategory = async (id, updates) => {
    try {
      const response = await apiClient.put(`/api/categories/${id}`, updates);
      if (response.success) {
        setCategories(prev => prev.map(cat => cat.id === id ? response.data : cat));
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteCategory = async (id) => {
    try {
      const response = await apiClient.delete(`/api/categories/${id}`);
      if (response.success) {
        setCategories(prev => prev.filter(cat => cat.id !== id));
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Helper functions for backward compatibility
  const getCategoryObject = useCallback(() => {
    return categories.reduce((obj, cat) => {
      obj[cat.id] = {
        name: cat.name,
        icon: cat.icon,
        fillClass: cat.fill_class
      };
      return obj;
    }, {});
  }, [categories]);

  const getCategoryBadges = useCallback(() => {
    return categories.reduce((obj, cat) => {
      obj[cat.id] = cat.badge_class;
      return obj;
    }, {});
  }, [categories]);

  return (
    <CategoriesContext.Provider value={{
      categories,
      loading,
      addCategory,
      updateCategory,
      deleteCategory,
      refreshCategories: fetchCategories,
      getCategoryObject,
      getCategoryBadges
    }}>
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoriesProvider');
  }
  return context;
};
