// Books API Client - Uses Backend API
import { apiClient } from './apiClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const booksClient = {
  // ========== BOOKS ==========
  
  async getBooks() {
    try {
      const response = await fetch(`${API_BASE}/api/books`);
      const result = await response.json();
      
      if (!result.success) throw new Error(result.message || 'Failed to get books');
      return { success: true, data: result.data };
    } catch (error) {
      console.error('[BOOKS] Get books error:', error);
      return { success: false, error };
    }
  },

  async addBook(bookData) {
    try {
      const response = await fetch(`${API_BASE}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData)
      });
      const result = await response.json();
      
      if (!result.success) throw new Error(result.message || 'Failed to add book');
      return { success: true, data: result.data };
    } catch (error) {
      console.error('[BOOKS] Add book error:', error);
      return { success: false, error };
    }
  },

  async updateBook(id, updates) {
    try {
      const response = await fetch(`${API_BASE}/api/books/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      
      if (!result.success) throw new Error(result.message || 'Failed to update book');
      return { success: true, data: result.data };
    } catch (error) {
      console.error('[BOOKS] Update book error:', error);
      return { success: false, error };
    }
  },

  async deleteBook(id) {
    try {
      const response = await fetch(`${API_BASE}/api/books/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (!result.success) throw new Error(result.message || 'Failed to delete book');
      return { success: true };
    } catch (error) {
      console.error('[BOOKS] Delete book error:', error);
      return { success: false, error };
    }
  },

  // ========== BOOK ASSIGNMENTS ==========

  async getAssignments(internId = null) {
    try {
      const url = internId 
        ? `${API_BASE}/api/book-assignments?intern_id=${internId}`
        : `${API_BASE}/api/book-assignments`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!result.success) throw new Error(result.message || 'Failed to get assignments');
      return { success: true, data: result.data };
    } catch (error) {
      console.error('[BOOKS] Get assignments error:', error);
      return { success: false, error };
    }
  },

  async assignBook(bookId, internId, dueDate = null) {
    try {
      const response = await fetch(`${API_BASE}/api/book-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          intern_id: internId,
          due_date: dueDate,
          status: 'assigned'
        })
      });
      const result = await response.json();
      
      if (!result.success) throw new Error(result.message || 'Failed to assign book');
      return { success: true, data: result.data };
    } catch (error) {
      console.error('[BOOKS] Assign book error:', error);
      return { success: false, error };
    }
  },

  async updateAssignmentStatus(assignmentId, status, notes = null) {
    try {
      const updates = { status };
      
      if (status === 'in-progress' && !notes) {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      
      if (notes) {
        updates.notes = notes;
      }
      
      const response = await fetch(`${API_BASE}/api/book-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      
      if (!result.success) throw new Error(result.message || 'Failed to update assignment');
      return { success: true, data: result.data };
    } catch (error) {
      console.error('[BOOKS] Update assignment error:', error);
      return { success: false, error };
    }
  },

  async deleteAssignment(assignmentId) {
    try {
      const response = await fetch(`${API_BASE}/api/book-assignments/${assignmentId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (!result.success) throw new Error(result.message || 'Failed to delete assignment');
      return { success: true };
    } catch (error) {
      console.error('[BOOKS] Delete assignment error:', error);
      return { success: false, error };
    }
  },

  // ========== STATISTICS ==========

  async getReadingStats(internId) {
    try {
      const response = await fetch(`${API_BASE}/api/book-assignments?intern_id=${internId}`);
      const result = await response.json();
      
      if (!result.success) throw new Error(result.message || 'Failed to get stats');
      
      const assignments = result.data;
      const stats = {
        total: assignments.length,
        assigned: assignments.filter(a => a.status === 'assigned').length,
        inProgress: assignments.filter(a => a.status === 'in-progress').length,
        completed: assignments.filter(a => a.status === 'completed').length
      };
      
      return { success: true, data: stats };
    } catch (error) {
      console.error('[BOOKS] Get stats error:', error);
      return { success: false, error };
    }
  }
};
