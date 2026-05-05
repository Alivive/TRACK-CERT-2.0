// Books API Client using Supabase directly
import { supabase } from './supabaseClient';

export const booksClient = {
  // ========== BOOKS ==========
  
  async getBooks() {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title', { ascending: true });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[BOOKS] Get books error:', error);
      return { success: false, error };
    }
  },

  async addBook(bookData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('books')
        .insert([{ ...bookData, created_by: user?.id }])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[BOOKS] Add book error:', error);
      return { success: false, error };
    }
  },

  async updateBook(id, updates) {
    try {
      const { data, error } = await supabase
        .from('books')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[BOOKS] Update book error:', error);
      return { success: false, error };
    }
  },

  async deleteBook(id) {
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('[BOOKS] Delete book error:', error);
      return { success: false, error };
    }
  },

  // ========== BOOK ASSIGNMENTS ==========

  async getAssignments(internId = null) {
    try {
      let query = supabase
        .from('book_assignments')
        .select(`
          *,
          books:book_id (title, author, pages),
          interns:intern_id (first_name, last_name)
        `)
        .order('assigned_at', { ascending: false });
      
      if (internId) {
        query = query.eq('intern_id', internId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Flatten the nested data structure
      const flattenedData = data.map(assignment => ({
        ...assignment,
        book_title: assignment.books?.title,
        book_author: assignment.books?.author,
        book_pages: assignment.books?.pages,
        intern_first_name: assignment.interns?.first_name,
        intern_last_name: assignment.interns?.last_name
      }));
      
      return { success: true, data: flattenedData };
    } catch (error) {
      console.error('[BOOKS] Get assignments error:', error);
      return { success: false, error };
    }
  },

  async assignBook(bookId, internId, dueDate = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('book_assignments')
        .insert([{
          book_id: bookId,
          intern_id: internId,
          assigned_by: user?.id,
          due_date: dueDate,
          status: 'assigned'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
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
      
      const { data, error } = await supabase
        .from('book_assignments')
        .update(updates)
        .eq('id', assignmentId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('[BOOKS] Update assignment error:', error);
      return { success: false, error };
    }
  },

  async deleteAssignment(assignmentId) {
    try {
      const { error } = await supabase
        .from('book_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('[BOOKS] Delete assignment error:', error);
      return { success: false, error };
    }
  },

  // ========== STATISTICS ==========

  async getReadingStats(internId) {
    try {
      const { data, error } = await supabase
        .from('book_assignments')
        .select('status')
        .eq('intern_id', internId);
      
      if (error) throw error;
      
      const stats = {
        total: data.length,
        assigned: data.filter(a => a.status === 'assigned').length,
        inProgress: data.filter(a => a.status === 'in-progress').length,
        completed: data.filter(a => a.status === 'completed').length
      };
      
      return { success: true, data: stats };
    } catch (error) {
      console.error('[BOOKS] Get stats error:', error);
      return { success: false, error };
    }
  }
};
