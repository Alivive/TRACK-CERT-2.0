const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const providerLinksClient = {
  // Get all provider links
  async getProviderLinks() {
    try {
      const response = await fetch(`${API_URL}/api/provider-links`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[PROVIDER LINKS] Get all error:', error);
      return { success: false, error };
    }
  },

  // Get provider link by name
  async getProviderLink(providerName) {
    try {
      const response = await fetch(`${API_URL}/api/provider-links/${encodeURIComponent(providerName)}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[PROVIDER LINKS] Get by name error:', error);
      return { success: false, error };
    }
  },

  // Add new provider link
  async addProviderLink(providerLink) {
    try {
      console.log('[PROVIDER LINKS CLIENT] Adding:', providerLink);
      const response = await fetch(`${API_URL}/api/provider-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerLink)
      });
      const data = await response.json();
      console.log('[PROVIDER LINKS CLIENT] Response:', response.status, data);
      
      if (!response.ok) {
        return { success: false, error: data.error || data.message || `HTTP ${response.status}` };
      }
      
      return data;
    } catch (error) {
      console.error('[PROVIDER LINKS] Add error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update provider link
  async updateProviderLink(id, updates) {
    try {
      const response = await fetch(`${API_URL}/api/provider-links/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[PROVIDER LINKS] Update error:', error);
      return { success: false, error };
    }
  },

  // Delete provider link
  async deleteProviderLink(id) {
    try {
      const response = await fetch(`${API_URL}/api/provider-links/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[PROVIDER LINKS] Delete error:', error);
      return { success: false, error };
    }
  }
};
