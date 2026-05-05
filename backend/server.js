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
    // Create user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([req.body])
      .select()
      .single();
    
    if (userError) throw userError;

    // If the user role is 'intern', also create an intern record
    if (req.body.role === 'intern' && req.body.full_name && req.body.email) {
      console.log('[API] Creating intern record for new user:', req.body.email);
      
      // Parse full name into first and last name
      const nameParts = req.body.full_name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      try {
        const { data: internData, error: internError } = await supabase
          .from('interns')
          .insert([{
            first_name: firstName,
            last_name: lastName,
            email: req.body.email,
            start_date: new Date().toISOString().split('T')[0] // Today's date
          }])
          .select()
          .single();
        
        if (internError) {
          console.error('[API] Failed to create intern record:', internError);
          // Don't fail the user creation, just log the error
        } else {
          console.log('[API] Intern record created successfully:', internData.id);
        }
      } catch (internCreationError) {
        console.error('[API] Exception creating intern record:', internCreationError);
        // Don't fail the user creation, just log the error
      }
    }
    
    res.json({ success: true, data: userData });
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
      .from('certifications')
      .select('*')
      .order('date', { ascending: false });
    
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
      .from('book_assignments')
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

// ========== ADMIN UTILITIES API ==========

app.post('/api/admin/sync-interns', async (req, res, next) => {
  try {
    console.log('[API] Starting intern sync process...');
    
    // Get all users with intern role
    const { data: internUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'intern');
    
    if (usersError) throw usersError;
    
    // Get all existing interns
    const { data: existingInterns, error: internsError } = await supabase
      .from('interns')
      .select('email');
    
    if (internsError) throw internsError;
    
    const existingEmails = new Set(existingInterns.map(i => i.email.toLowerCase()));
    const created = [];
    const skipped = [];
    
    // Create intern records for users who don't have them
    for (const user of internUsers) {
      if (!user.email || existingEmails.has(user.email.toLowerCase())) {
        skipped.push(user.email);
        continue;
      }
      
      // Parse full name
      const nameParts = (user.full_name || '').trim().split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      try {
        const { data: newIntern, error: createError } = await supabase
          .from('interns')
          .insert([{
            first_name: firstName,
            last_name: lastName,
            email: user.email,
            start_date: new Date().toISOString().split('T')[0]
          }])
          .select()
          .single();
        
        if (createError) {
          console.error('[API] Failed to create intern for:', user.email, createError);
          skipped.push(user.email);
        } else {
          console.log('[API] Created intern record for:', user.email);
          created.push(user.email);
        }
      } catch (error) {
        console.error('[API] Exception creating intern for:', user.email, error);
        skipped.push(user.email);
      }
    }
    
    console.log('[API] Sync complete. Created:', created.length, 'Skipped:', skipped.length);
    
    res.json({ 
      success: true, 
      data: {
        created: created.length,
        skipped: skipped.length,
        createdEmails: created,
        skippedEmails: skipped
      }
    });
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
