import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
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

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp', 
      'image/gif', 
      'image/bmp', 
      'image/tiff', 
      'image/svg+xml',
      'application/pdf'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, WEBP, GIF, BMP, TIFF, SVG) and PDF files are allowed.'));
    }
  }
});

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

// Diagnostic endpoint to check user status
app.get('/api/users/diagnose/:email', async (req, res, next) => {
  try {
    const email = req.params.email.toLowerCase();
    console.log('[API] Diagnosing user:', email);
    
    const diagnosis = {
      email,
      timestamp: new Date().toISOString(),
      authUser: null,
      dbUser: null,
      internRecord: null,
      issues: []
    };
    
    // Check Supabase Auth
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;
      
      diagnosis.authUser = authUsers.users.find(u => u.email.toLowerCase() === email);
      
      if (!diagnosis.authUser) {
        diagnosis.issues.push('User not found in Supabase Auth');
      } else {
        diagnosis.authUser = {
          id: diagnosis.authUser.id,
          email: diagnosis.authUser.email,
          created_at: diagnosis.authUser.created_at,
          email_confirmed: diagnosis.authUser.email_confirmed_at ? true : false,
          metadata: diagnosis.authUser.user_metadata
        };
      }
    } catch (authError) {
      diagnosis.issues.push(`Auth check failed: ${authError.message}`);
    }
    
    // Check users table
    try {
      const { data: dbUsers, error: dbError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email);
      
      if (dbError) throw dbError;
      
      diagnosis.dbUser = dbUsers[0] || null;
      
      if (!diagnosis.dbUser) {
        diagnosis.issues.push('User profile not found in users table');
      } else if (diagnosis.authUser && diagnosis.dbUser.id !== diagnosis.authUser.id) {
        diagnosis.issues.push('User ID mismatch between auth and database');
      }
    } catch (dbError) {
      diagnosis.issues.push(`Database check failed: ${dbError.message}`);
    }
    
    // Check interns table
    try {
      const { data: interns, error: internError } = await supabase
        .from('interns')
        .select('*')
        .ilike('email', email);
      
      if (internError) throw internError;
      
      diagnosis.internRecord = interns[0] || null;
      
      if (diagnosis.dbUser?.role === 'intern' && !diagnosis.internRecord) {
        diagnosis.issues.push('User is intern but no intern record found');
      } else if (diagnosis.dbUser?.role === 'intern' && diagnosis.dbUser.intern_id !== diagnosis.internRecord?.id) {
        diagnosis.issues.push('Intern record not properly linked to user');
      }
    } catch (internError) {
      diagnosis.issues.push(`Intern check failed: ${internError.message}`);
    }
    
    diagnosis.status = diagnosis.issues.length === 0 ? 'OK' : 'ISSUES_FOUND';
    
    res.json({ success: true, diagnosis });
  } catch (error) {
    next(error);
  }
});

// Repair endpoint to fix user issues
app.post('/api/users/repair/:email', async (req, res, next) => {
  try {
    const email = req.params.email.toLowerCase();
    console.log('[API] Repairing user:', email);
    
    const repairs = {
      email,
      timestamp: new Date().toISOString(),
      actions: [],
      success: true
    };
    
    // Get auth user
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;
    
    const authUser = authUsers.users.find(u => u.email.toLowerCase() === email);
    
    if (!authUser) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found in authentication system' 
      });
    }
    
    // Check/create user profile
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email);
    
    let dbUser = dbUsers?.[0];
    
    if (!dbUser) {
      console.log('[API] Creating missing user profile');
      
      const newProfile = {
        id: authUser.id,
        email: authUser.email.toLowerCase(),
        full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        role: authUser.user_metadata?.role || 'intern',
        created_at: authUser.created_at
      };
      
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert([newProfile])
        .select()
        .single();
      
      if (createError) throw createError;
      
      dbUser = createdUser;
      repairs.actions.push('Created user profile in database');
    } else if (dbUser.id !== authUser.id) {
      console.log('[API] Fixing user ID mismatch');
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ id: authUser.id })
        .eq('email', email);
      
      if (updateError) throw updateError;
      
      dbUser.id = authUser.id;
      repairs.actions.push('Fixed user ID mismatch');
    }
    
    // Check/create intern record if needed
    if (dbUser.role === 'intern') {
      const { data: interns, error: internError } = await supabase
        .from('interns')
        .select('*')
        .ilike('email', email);
      
      let internRecord = interns?.[0];
      
      if (!internRecord) {
        console.log('[API] Creating missing intern record');
        
        const nameParts = dbUser.full_name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const { data: createdIntern, error: createInternError } = await supabase
          .from('interns')
          .insert([{
            first_name: firstName,
            last_name: lastName,
            email: dbUser.email,
            start_date: new Date().toISOString().split('T')[0]
          }])
          .select()
          .single();
        
        if (createInternError) throw createInternError;
        
        internRecord = createdIntern;
        repairs.actions.push('Created intern record');
      }
      
      // Link intern to user if not linked
      if (dbUser.intern_id !== internRecord.id) {
        console.log('[API] Linking intern record to user');
        
        const { error: linkError } = await supabase
          .from('users')
          .update({ intern_id: internRecord.id })
          .eq('id', dbUser.id);
        
        if (linkError) throw linkError;
        
        repairs.actions.push('Linked intern record to user profile');
      }
    }
    
    if (repairs.actions.length === 0) {
      repairs.actions.push('No repairs needed - user is properly configured');
    }
    
    // Return the complete user profile for cache update
    const { data: finalProfile, error: finalError } = await supabase
      .from('users')
      .select('*')
      .eq('id', dbUser.id)
      .single();
    
    if (finalError) throw finalError;
    
    repairs.profile = finalProfile;
    
    res.json({ success: true, repairs });
  } catch (error) {
    console.error('[API] Repair error:', error);
    next(error);
  }
});

// Force refresh profile endpoint - returns fresh profile data
app.get('/api/users/refresh/:userId', async (req, res, next) => {
  try {
    const userId = req.params.userId;
    console.log('[API] Force refreshing profile for:', userId);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json({ 
      success: true, 
      data,
      timestamp: new Date().toISOString(),
      message: 'Profile refreshed - cache should be updated'
    });
  } catch (error) {
    next(error);
  }
});

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
    console.log('[API] Fetching user profile for ID:', req.params.id);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) {
      console.error('[API] User profile fetch error:', error);
      
      // If user not found in users table, try to create from auth user
      if (error.code === 'PGRST116') {
        console.log('[API] User profile not found, attempting to create from auth user');
        
        try {
          // Get user from Supabase Auth
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(req.params.id);
          
          if (authError || !authUser) {
            console.error('[API] Auth user not found:', authError);
            throw error; // Return original error
          }
          
          console.log('[API] Found auth user, creating profile:', authUser.user.email);
          
          // Create user profile from auth metadata
          const newProfile = {
            id: authUser.user.id,
            email: authUser.user.email,
            full_name: authUser.user.user_metadata?.full_name || authUser.user.email.split('@')[0],
            role: authUser.user.user_metadata?.role || 'intern',
            created_at: authUser.user.created_at
          };
          
          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert([newProfile])
            .select()
            .single();
          
          if (createError) {
            console.error('[API] Failed to create user profile:', createError);
            throw error; // Return original error
          }
          
          console.log('[API] User profile created successfully:', createdUser.email);
          
          // If role is intern, create intern record
          if (createdUser.role === 'intern') {
            const nameParts = createdUser.full_name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            const { data: internData, error: internError } = await supabase
              .from('interns')
              .insert([{
                first_name: firstName,
                last_name: lastName,
                email: createdUser.email,
                start_date: new Date().toISOString().split('T')[0]
              }])
              .select()
              .single();
            
            if (!internError && internData) {
              await supabase
                .from('users')
                .update({ intern_id: internData.id })
                .eq('id', createdUser.id);
              
              createdUser.intern_id = internData.id;
              console.log('[API] Intern record created and linked:', internData.id);
            }
          }
          
          return res.json({ success: true, data: createdUser });
        } catch (recoveryError) {
          console.error('[API] Profile recovery failed:', recoveryError);
          throw error; // Return original error
        }
      }
      
      throw error;
    }
    
    console.log('[API] User profile fetched successfully:', data.email);
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

    // If the user role is 'intern', also create an intern record and link it
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
          
          // Update user record with intern_id
          try {
            const { error: linkError } = await supabase
              .from('users')
              .update({ intern_id: internData.id })
              .eq('id', userData.id);
            
            if (linkError) {
              console.error('[API] Failed to link user to intern:', linkError);
            } else {
              console.log('[API] User linked to intern successfully');
              // Update the returned user data to include intern_id
              userData.intern_id = internData.id;
            }
          } catch (linkException) {
            console.error('[API] Exception linking user to intern:', linkException);
          }
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

// Get certifications with optional filtering
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

// Check for duplicate certifications (admin utility)
app.get('/api/certifications/duplicates', async (req, res, next) => {
  try {
    const { data: allCerts, error } = await supabase
      .from('certifications')
      .select('intern_id, name, provider, id, date')
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    // Find duplicates
    const duplicateMap = new Map();
    const duplicates = [];
    
    allCerts.forEach(cert => {
      const key = `${cert.intern_id}|${cert.name.toLowerCase().trim()}|${cert.provider.toLowerCase().trim()}`;
      if (duplicateMap.has(key)) {
        duplicates.push({
          duplicate: cert,
          original: duplicateMap.get(key)
        });
      } else {
        duplicateMap.set(key, cert);
      }
    });
    
    res.json({ 
      success: true, 
      duplicates,
      total_certifications: allCerts.length,
      duplicate_count: duplicates.length
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/certifications', upload.single('certificate_file'), async (req, res, next) => {
  try {
    console.log('[API] Creating certification with data:', {
      intern_id: req.body.intern_id,
      name: req.body.name,
      provider: req.body.provider,
      category: req.body.category,
      hours: req.body.hours,
      date: req.body.date,
      hasFile: !!req.file,
      fileUrl: req.body.certificate_file_url
    });
    
    // Check for duplicates BEFORE processing file upload
    const { intern_id, name, provider } = req.body;
    
    if (!intern_id || !name || !provider) {
      console.error('[API] Missing required fields:', { intern_id, name, provider });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: intern_id, name, and provider are required' 
      });
    }
    
    // Check for existing certification with same intern_id, name, and provider
    const { data: existingCerts, error: checkError } = await supabase
      .from('certifications')
      .select('id, name, provider, date')
      .eq('intern_id', intern_id)
      .ilike('name', name.trim())
      .ilike('provider', provider.trim());
    
    if (checkError) {
      console.error('Duplicate check error:', checkError);
      throw new Error('Failed to check for duplicate certifications: ' + checkError.message);
    }
    
    if (existingCerts && existingCerts.length > 0) {
      const existing = existingCerts[0];
      console.log('[API] Duplicate certification detected:', existing);
      return res.status(409).json({ 
        success: false, 
        error: 'DUPLICATE_CERTIFICATION',
        message: `This certification already exists: "${existing.name}" from "${existing.provider}" (added on ${existing.date})`,
        existing: existing
      });
    }
    
    let certificateFileUrl = req.body.certificate_file_url || null;
    
    // Handle file upload if present (overrides URL if both provided)
    if (req.file) {
      const fileExtension = req.file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `certificates/${fileName}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('certificate-attachments')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });
      
      if (uploadError) {
        console.error('File upload error:', uploadError);
        throw new Error('Failed to upload certificate file: ' + uploadError.message);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('certificate-attachments')
        .getPublicUrl(filePath);
      
      certificateFileUrl = urlData.publicUrl;
    }
    
    // Prepare certification data
    const certificationData = {
      ...req.body,
      certificate_file_url: certificateFileUrl
    };
    
    // Remove fields that are not database columns
    delete certificationData.certificate_file;
    delete certificationData.verification_url;
    
    console.log('[API] Inserting certification data:', certificationData);
    
    const { data, error } = await supabase
      .from('certifications')
      .insert([certificationData])
      .select()
      .single();
    
    if (error) {
      console.error('[API] Database insertion error:', error);
      
      // Handle unique constraint violation (duplicate certification)
      if (error.code === '23505' && error.message.includes('unique_certification_per_intern')) {
        return res.status(409).json({ 
          success: false, 
          error: 'DUPLICATE_CERTIFICATION',
          message: `This certification already exists: "${certificationData.name}" from "${certificationData.provider}"`,
          constraint: 'Database constraint violation - duplicate certification detected'
        });
      }
      
      // Handle category constraint violation
      if (error.code === '23514' && error.message.includes('category')) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_CATEGORY',
          message: `Invalid category: "${certificationData.category}". Please check available categories.`,
          constraint: 'Category constraint violation'
        });
      }
      
      throw error;
    }
    
    console.log('[API] Certification created successfully:', data);
    
    // Create notification for all admins when intern adds certification
    try {
      // Get the intern's name
      const { data: internData } = await supabase
        .from('users')
        .select('full_name')
        .eq('intern_id', data.intern_id)
        .single();
      
      const internName = internData?.full_name || 'An intern';
      
      // Get all admin users
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');
      
      if (admins && admins.length > 0) {
        // Create notifications for all admins
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'cert_added',
          title: 'New Certification Added',
          message: `${internName} added "${data.name}" from ${data.provider}`,
          read: false,
          created_at: new Date().toISOString()
        }));
        
        await supabase
          .from('notifications')
          .insert(notifications);
        
        console.log(`[API] Created ${notifications.length} notification(s) for admins`);
      }
    } catch (notifError) {
      // Don't fail the request if notification fails
      console.error('[API] Failed to create notification:', notifError);
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('[API] Certification creation failed:', error);
    next(error);
  }
});

app.put('/api/certifications/:id', upload.single('certificate_file'), async (req, res, next) => {
  try {
    let updateData = { ...req.body };
    
    // Handle file upload if present
    if (req.file) {
      // Get existing certification to potentially delete old file
      const { data: existingCert } = await supabase
        .from('certifications')
        .select('certificate_file_url')
        .eq('id', req.params.id)
        .single();
      
      const fileExtension = req.file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `certificates/${fileName}`;
      
      // Upload new file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('certificate-attachments')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });
      
      if (uploadError) {
        console.error('File upload error:', uploadError);
        throw new Error('Failed to upload certificate file: ' + uploadError.message);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('certificate-attachments')
        .getPublicUrl(filePath);
      
      updateData.certificate_file_url = urlData.publicUrl;
      
      // Delete old file if it exists
      if (existingCert?.certificate_file_url) {
        try {
          const oldFilePath = existingCert.certificate_file_url.split('/').pop();
          await supabase.storage
            .from('certificate-attachments')
            .remove([`certificates/${oldFilePath}`]);
        } catch (deleteError) {
          console.warn('Could not delete old certificate file:', deleteError);
        }
      }
    }
    
    // Remove fields that are not database columns
    delete updateData.certificate_file;
    delete updateData.verification_url;
    
    const { data, error } = await supabase
      .from('certifications')
      .update(updateData)
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
    // Get certification to delete associated file
    const { data: cert } = await supabase
      .from('certifications')
      .select('certificate_file_url')
      .eq('id', req.params.id)
      .single();
    
    // Delete the certification record
    const { error } = await supabase
      .from('certifications')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    // Delete associated file if it exists
    if (cert?.certificate_file_url) {
      try {
        const filePath = cert.certificate_file_url.split('/').pop();
        await supabase.storage
          .from('certificate-attachments')
          .remove([`certificates/${filePath}`]);
      } catch (deleteError) {
        console.warn('Could not delete certificate file:', deleteError);
      }
    }
    
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

// Delete user from both auth and database (admin only)
app.delete('/api/admin/users/:email', async (req, res, next) => {
  try {
    const email = req.params.email;
    console.log('[API] Admin deleting user:', email);
    
    // First, get the user from auth to get their ID
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    
    const authUser = authUsers.users.find(u => u.email === email);
    
    if (authUser) {
      // Delete from auth
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(authUser.id);
      if (authDeleteError) {
        console.error('[API] Failed to delete from auth:', authDeleteError);
        throw authDeleteError;
      }
      console.log('[API] Deleted from auth:', email);
    }
    
    // Delete from users table
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('email', email);
    
    if (userDeleteError) {
      console.error('[API] Failed to delete from users table:', userDeleteError);
    } else {
      console.log('[API] Deleted from users table:', email);
    }
    
    // Delete from interns table if exists
    const { error: internDeleteError } = await supabase
      .from('interns')
      .delete()
      .eq('email', email);
    
    if (internDeleteError) {
      console.error('[API] Failed to delete from interns table:', internDeleteError);
    } else {
      console.log('[API] Deleted from interns table:', email);
    }
    
    res.json({ 
      success: true, 
      message: `User ${email} completely removed from system`,
      deletedFromAuth: !!authUser,
      deletedFromUsers: !userDeleteError,
      deletedFromInterns: !internDeleteError
    });
  } catch (error) {
    console.error('[API] Admin delete user error:', error);
    next(error);
  }
});

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
      .select('*');
    
    if (internsError) throw internsError;
    
    const existingEmails = new Map(existingInterns.map(i => [i.email.toLowerCase(), i.id]));
    const created = [];
    const linked = [];
    const skipped = [];
    
    // Create intern records for users who don't have them AND link existing ones
    for (const user of internUsers) {
      if (!user.email) {
        skipped.push(user.email || 'no-email');
        continue;
      }
      
      const emailLower = user.email.toLowerCase();
      let internId = existingEmails.get(emailLower);
      
      if (!internId) {
        // Create new intern record
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
            continue;
          } else {
            console.log('[API] Created intern record for:', user.email);
            created.push(user.email);
            internId = newIntern.id;
          }
        } catch (error) {
          console.error('[API] Exception creating intern for:', user.email, error);
          skipped.push(user.email);
          continue;
        }
      }
      
      // Update user profile with intern_id if not already set
      if (internId && user.intern_id !== internId) {
        try {
          const { error: updateError } = await supabase
            .from('users')
            .update({ intern_id: internId })
            .eq('id', user.id);
          
          if (updateError) {
            console.error('[API] Failed to link user to intern:', user.email, updateError);
          } else {
            console.log('[API] Linked user to intern:', user.email, '→', internId);
            linked.push(user.email);
          }
        } catch (error) {
          console.error('[API] Exception linking user to intern:', user.email, error);
        }
      } else if (internId) {
        // Already linked
        skipped.push(user.email);
      }
    }
    
    console.log('[API] Sync complete. Created:', created.length, 'Linked:', linked.length, 'Skipped:', skipped.length);
    
    res.json({ 
      success: true, 
      data: {
        created: created.length,
        linked: linked.length,
        skipped: skipped.length,
        createdEmails: created,
        linkedEmails: linked,
        skippedEmails: skipped
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/fix-category-constraint', async (req, res, next) => {
  try {
    console.log('[API] Fixing category constraint...');
    
    // Get all existing categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id');
    
    if (categoriesError) throw categoriesError;
    
    const categoryIds = categories.map(c => c.id);
    console.log('[API] Found categories:', categoryIds);
    
    // Drop the old constraint and create a new one with all categories
    const constraintSQL = `
      ALTER TABLE certifications 
      DROP CONSTRAINT IF EXISTS certifications_category_check;
      
      ALTER TABLE certifications 
      ADD CONSTRAINT certifications_category_check 
      CHECK (category IN (${categoryIds.map(id => `'${id}'`).join(', ')}));
    `;
    
    console.log('[API] Executing SQL:', constraintSQL);
    
    // Execute the constraint update
    const { error: sqlError } = await supabase.rpc('exec_sql', { 
      sql_query: constraintSQL 
    });
    
    if (sqlError) {
      console.error('[API] SQL execution failed:', sqlError);
      // Try alternative approach - direct constraint update
      const { error: altError } = await supabase
        .from('certifications')
        .select('id')
        .limit(1);
      
      if (altError && altError.message.includes('category_check')) {
        throw new Error('Category constraint needs manual database update. Categories needed: ' + categoryIds.join(', '));
      }
    }
    
    console.log('[API] Category constraint updated successfully');
    
    res.json({ 
      success: true, 
      data: {
        message: 'Category constraint updated',
        allowedCategories: categoryIds
      }
    });
  } catch (error) {
    console.error('[API] Fix constraint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update constraint',
      message: error.message,
      suggestion: 'Manual database update may be required'
    });
  }
});

// ========== NOTIFICATIONS API ==========

app.get('/api/notifications', async (req, res, next) => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Filter by user_id or intern_id based on query params
    if (req.query.user_id) {
      query = query.eq('user_id', req.query.user_id);
    }
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

app.post('/api/notifications', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.put('/api/notifications/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
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

app.delete('/api/notifications/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Bulk operations for notifications
app.put('/api/notifications/mark-all-read', async (req, res, next) => {
  try {
    const { user_id, intern_id } = req.body;
    
    let query = supabase
      .from('notifications')
      .update({ read: true });
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (intern_id) {
      query = query.eq('intern_id', intern_id);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'user_id or intern_id is required' 
      });
    }
    
    const { data, error } = await query.select();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/notifications/clear-all', async (req, res, next) => {
  try {
    const { user_id, intern_id } = req.body;
    
    let query = supabase
      .from('notifications')
      .delete();
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (intern_id) {
      query = query.eq('intern_id', intern_id);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'user_id or intern_id is required' 
      });
    }
    
    const { error } = await query;
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== PROVIDER LINKS API ==========

// Backfill existing certifications with provider links (must be before /:name route)
app.post('/api/provider-links/backfill', async (req, res, next) => {
  try {
    console.log('[API] Starting provider links backfill...');
    
    // Get all provider links
    const { data: providerLinks, error: linksError } = await supabase
      .from('provider_links')
      .select('*');
    
    if (linksError) throw linksError;
    
    // Create a map of provider names to base URLs (case-insensitive + aliases)
    const providerMap = new Map();
    
    // Define aliases for common provider name variations
    const aliases = {
      'ibm skillsbuild': 'ibm',
      'linkedin': 'linkedin learning',
      'microsoft': 'microsoft learn',
      'hubspot': 'hubspot academy',
      'google': 'google (grow)',
      'hp': 'hp life',
      'free code camp': 'freecodecamp',
      'simpilearn': 'simplilearn',
      'udemy': 'udemy',
      'canva': 'canva',
      'databricks': 'databricks'
    };
    
    providerLinks.forEach(link => {
      const key = link.provider_name.toLowerCase().trim();
      providerMap.set(key, link.base_url);
    });
    
    // Add aliases to the map
    Object.entries(aliases).forEach(([alias, canonical]) => {
      const canonicalKey = canonical.toLowerCase();
      if (providerMap.has(canonicalKey)) {
        providerMap.set(alias.toLowerCase(), providerMap.get(canonicalKey));
      }
    });
    
    console.log('[API] Found', providerLinks.length, 'provider links');
    
    // Get ALL certifications (not just ones missing URLs)
    const { data: certifications, error: certsError } = await supabase
      .from('certifications')
      .select('*');
    
    if (certsError) throw certsError;
    
    console.log('[API] Found', certifications.length, 'certifications to check');
    
    let updated = 0;
    let skipped = 0;
    const errors = [];
    
    // Update each certification
    for (const cert of certifications) {
      if (!cert.provider) {
        skipped++;
        continue;
      }
      
      const providerKey = cert.provider.toLowerCase().trim();
      const correctUrl = providerMap.get(providerKey);
      
      if (correctUrl) {
        // Check if the current URL is wrong or missing
        const needsUpdate = !cert.certificate_url || 
                           cert.certificate_url === '' || 
                           cert.certificate_url === cert.provider || // URL is just the provider name
                           !cert.certificate_url.startsWith('http'); // URL doesn't look like a URL
        
        if (needsUpdate) {
          try {
            const { error: updateError } = await supabase
              .from('certifications')
              .update({ certificate_url: correctUrl })
              .eq('id', cert.id);
            
            if (updateError) {
              console.error('[API] Failed to update cert:', cert.id, updateError);
              errors.push({ id: cert.id, name: cert.name, error: updateError.message });
            } else {
              updated++;
              console.log('[API] Updated cert:', cert.id, 'from', cert.certificate_url, 'to', correctUrl);
            }
          } catch (err) {
            console.error('[API] Exception updating cert:', cert.id, err);
            errors.push({ id: cert.id, name: cert.name, error: err.message });
          }
        } else {
          skipped++;
          console.log('[API] Cert already has valid URL:', cert.id);
        }
      } else {
        skipped++;
        console.log('[API] No provider link found for:', cert.provider);
      }
    }
    
    console.log('[API] Backfill complete. Updated:', updated, 'Skipped:', skipped, 'Errors:', errors.length);
    
    res.json({ 
      success: true, 
      data: {
        total: certifications.length,
        updated,
        skipped,
        errors: errors.length,
        errorDetails: errors
      }
    });
  } catch (error) {
    console.error('[API] Error in backfill:', error);
    next(error);
  }
});

// Get all provider links
app.get('/api/provider-links', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('provider_links')
      .select('*')
      .order('provider_name');
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Get provider link by name
app.get('/api/provider-links/:name', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('provider_links')
      .select('*')
      .ilike('provider_name', req.params.name)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    res.json({ success: true, data: data || null });
  } catch (error) {
    next(error);
  }
});

// Add new provider link (admin only)
app.post('/api/provider-links', async (req, res, next) => {
  try {
    console.log('[API] POST /api/provider-links - Body:', req.body);
    const { provider_name, base_url, description } = req.body;
    
    if (!provider_name || !base_url) {
      console.log('[API] Missing required fields');
      return res.status(400).json({ 
        success: false, 
        error: 'Provider name and base URL are required' 
      });
    }

    console.log('[API] Inserting provider link:', { provider_name, base_url, description });
    const { data, error } = await supabase
      .from('provider_links')
      .insert([{ provider_name, base_url, description }])
      .select()
      .single();
    
    if (error) {
      console.error('[API] Supabase error:', error);
      throw error;
    }
    
    console.log('[API] Successfully added provider link:', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[API] Error in POST /api/provider-links:', error);
    next(error);
  }
});

// Update provider link (admin only)
app.put('/api/provider-links/:id', async (req, res, next) => {
  try {
    const { provider_name, base_url, description } = req.body;
    
    const { data, error } = await supabase
      .from('provider_links')
      .update({ 
        provider_name, 
        base_url, 
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Delete provider link (admin only)
app.delete('/api/provider-links/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('provider_links')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
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

// Error handling middleware (must be after all routes)
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ CerTrack Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API endpoints: http://localhost:${PORT}/api/*`);
});

export default app;
