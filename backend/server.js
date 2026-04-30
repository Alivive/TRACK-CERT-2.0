import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173', // Local development
    'http://localhost:3000', // Local development
    /\.vercel\.app$/, // Any Vercel deployment
    /\.onrender\.com$/ // Any Render deployment
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CerTrack Backend API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check for Render
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Test Supabase connection
app.get('/api/test-connection', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('project_name')
      .limit(1);
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Supabase connection successful',
      project: data[0]?.project_name || 'CerTrack'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Supabase connection failed',
      error: error.message
    });
  }
});

// Get admin settings
app.get('/api/admin-settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update admin settings
app.put('/api/admin-settings', async (req, res) => {
  try {
    const { project_name, admin_code, intern_code } = req.body;
    
    const { data, error } = await supabase
      .from('admin_settings')
      .upsert({
        id: 1,
        project_name,
        admin_code,
        intern_code
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user profile by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update user profile
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all interns
app.get('/api/interns', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('interns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add new intern
app.post('/api/interns', async (req, res) => {
  try {
    const { first_name, last_name, email, start_date } = req.body;
    
    const { data, error } = await supabase
      .from('interns')
      .insert({
        first_name,
        last_name,
        email,
        start_date
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get certifications
app.get('/api/certifications', async (req, res) => {
  try {
    const { intern_id } = req.query;
    
    let query = supabase
      .from('certifications')
      .select(`
        *,
        interns (
          first_name,
          last_name,
          email
        )
      `)
      .order('date', { ascending: false });
    
    if (intern_id) {
      query = query.eq('intern_id', intern_id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add new certification
app.post('/api/certifications', async (req, res) => {
  try {
    const { intern_id, name, provider, category, hours, date } = req.body;
    
    const { data, error } = await supabase
      .from('certifications')
      .insert({
        intern_id,
        name,
        provider,
        category,
        hours,
        date
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CerTrack Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
});

export default app;