import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ========== HEALTH & INFO ==========

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'CerTrack Backend API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'CerTrack Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/users',
      interns: '/api/interns',
      certifications: '/api/certifications',
      categories: '/api/categories',
      books: '/api/books',
      assignments: '/api/book-assignments'
    }
  });
});

// ========== USERS API ==========

app.get('/api/users', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.post('/api/users', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.put('/api/users/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ========== INTERNS API ==========

app.get('/api/interns', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('interns')
      .select('*')
      .order('first_name', { ascending: true });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.get('/api/interns/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('interns')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.post('/api/interns', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('interns')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.put('/api/interns/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('interns')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/interns/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('interns')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== CERTIFICATIONS API ==========

app.get('/api/certifications', async (req, res, next) => {
  try {
    let query = supabase
      .from('certification_details')
      .select('*')
      .order('date_obtained', { ascending: false });
    
    if (req.query.intern_id) {
      query = query.eq('intern_id', req.query.intern_id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.post('/api/certifications', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('certifications')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.put('/api/certifications/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('certifications')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/certifications/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('certifications')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== CATEGORIES API ==========

app.get('/api/categories', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.post('/api/categories', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.put('/api/categories/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/categories/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== BOOKS API ==========

app.get('/api/books', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('title', { ascending: true });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.post('/api/books', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.put('/api/books/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/books/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== BOOK ASSIGNMENTS API ==========

app.get('/api/book-assignments', async (req, res, next) => {
  try {
    let query = supabase
      .from('book_assignment_details')
      .select('*')
      .order('assigned_at', { ascending: false });
    
    if (req.query.intern_id) {
      query = query.eq('intern_id', req.query.intern_id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.post('/api/book-assignments', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('book_assignments')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.put('/api/book-assignments/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('book_assignments')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/book-assignments/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('book_assignments')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== ADMIN SETTINGS API ==========

app.get('/api/admin-settings', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin-settings', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .update(req.body)
      .eq('id', 1)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ========== ERROR HANDLERS ==========

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal Server Error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ CerTrack Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API endpoints: http://localhost:${PORT}/api/*`);
});

export default app;
