// API Client for CerTrack Backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }

  // Test connection
  async testConnection() {
    return this.get('/api/test-connection');
  }

  // Admin Settings
  async getAdminSettings() {
    return this.get('/api/admin-settings');
  }

  async updateAdminSettings(settings) {
    return this.put('/api/admin-settings', settings);
  }

  // Users
  async getUsers() {
    return this.get('/api/users');
  }

  async getUser(id) {
    return this.get(`/api/users/${id}`);
  }

  async updateUser(id, updates) {
    return this.put(`/api/users/${id}`, updates);
  }

  // Interns
  async getInterns() {
    return this.get('/api/interns');
  }

  async addIntern(internData) {
    return this.post('/api/interns', internData);
  }

  // Certifications
  async getCertifications(internId = null) {
    const endpoint = internId 
      ? `/api/certifications?intern_id=${internId}`
      : '/api/certifications';
    return this.get(endpoint);
  }

  async addCertification(certData) {
    return this.post('/api/certifications', certData);
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();
export default apiClient;