# CerTrack Supabase Setup Guide

## Overview
This guide walks you through setting up your Supabase database for the CerTrack certification tracking system.

## Prerequisites
- Supabase account (free tier available at https://supabase.com)
- Access to your Supabase project dashboard
- The `supabase_schema.sql` file from this directory

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: CerTrack (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for initialization (2-3 minutes)

---

## Step 2: Run the SQL Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `supabase_schema.sql`
4. Paste it into the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. Wait for completion - you should see "Success" messages

### What Gets Created:
- ✅ `admin_settings` - System configuration
- ✅ `interns` - Intern profiles
- ✅ `certifications` - Certification records
- ✅ `users` - User accounts (empty initially)
- ✅ `passkeys` - WebAuthn passkey credentials
- ✅ `passkey_registrations` - Temporary registration data
- ✅ `audit_log` - Admin action tracking
- ✅ Views for common queries
- ✅ Triggers for automatic timestamps
- ✅ Row-level security policies

---

## Step 3: Configure Supabase Connection

### Get Your Connection Details

1. Go to **Settings** → **Database** (left sidebar)
2. Under "Connection string", select **"URI"**
3. Copy the connection string (looks like: `postgresql://...`)
4. Note your **Project URL** and **Anon Key** from **Settings** → **API**

### Create Environment File

Create a `.env.local` file in your `backend/` directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres

# Application Settings
NODE_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret-here
```

**⚠️ IMPORTANT**: Never commit `.env.local` to git. Add it to `.gitignore`.

---

## Step 4: Set Up Authentication (Passkeys)

### Enable Supabase Auth

1. Go to **Authentication** → **Providers** (left sidebar)
2. Ensure **Email** is enabled (default)
3. For passkeys, you'll need to implement WebAuthn on your backend

### Initial Passkey Setup (No Users)

The system is configured to have **NO users initially**, only passkeys. Here's how to add them:

#### Option A: Manual Passkey Registration (Recommended)
1. Implement the passkey registration endpoint in your backend
2. Users register with their email and passkey
3. System creates user account + passkey record automatically

#### Option B: Bulk Import Passkeys (Admin Only)
If you have pre-generated passkeys, you can import them:

```sql
-- Example: Insert a passkey (you'll need the actual credential data)
INSERT INTO passkeys (
  credential_id,
  public_key,
  sign_count,
  transports,
  backup_eligible,
  backup_state,
  attestation_type
) VALUES (
  decode('base64-encoded-credential-id', 'base64'),
  decode('base64-encoded-public-key', 'base64'),
  0,
  ARRAY['internal', 'platform'],
  true,
  false,
  'none'
);
```

---

## Step 5: Configure Frontend Connection

Update `frontend/src/utils/supabaseClient.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Create `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Step 6: Verify Database Setup

Run this query in Supabase SQL Editor to verify everything:

```sql
-- Check all tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check admin settings
SELECT * FROM admin_settings;

-- Check views exist
SELECT viewname FROM pg_views 
WHERE schemaname = 'public' 
ORDER BY viewname;
```

Expected output:
- 7 tables: admin_settings, audit_log, certifications, interns, passkey_registrations, passkeys, users
- 2 views: certifications_by_category, intern_stats
- admin_settings has 1 row with default values

---

## Step 7: Test the Connection

### From Backend (Node.js)

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Test query
const { data, error } = await supabase
  .from('admin_settings')
  .select('*')
  .single()

console.log(data, error)
```

### From Frontend (React)

```javascript
import { supabase } from './utils/supabaseClient'

const { data, error } = await supabase
  .from('admin_settings')
  .select('*')
  .single()

console.log(data, error)
```

---

## Step 8: Set Up Row-Level Security (RLS)

The schema includes RLS policies. To enable them:

1. Go to **Authentication** → **Policies** (left sidebar)
2. Verify policies are enabled for each table
3. Test with different user roles (admin vs intern)

### Key Policies:
- **Users**: Can only see their own profile (unless admin)
- **Interns**: Can see all intern profiles
- **Certifications**: Interns see only their own; admins see all
- **Passkeys**: Users see only their own
- **Audit Log**: Admins only

---

## Step 9: Configure Access Codes

The system uses access codes for signup verification:

- **Admin Code**: `ADMIN2026` (default)
- **Intern Code**: `INTERNS2026` (default)

To change these, update in Supabase:

```sql
UPDATE admin_settings 
SET admin_code = 'YOUR_NEW_ADMIN_CODE',
    intern_code = 'YOUR_NEW_INTERN_CODE'
WHERE id = 1;
```

---

## Step 10: Backup & Recovery

### Enable Automated Backups

1. Go to **Settings** → **Backups** (left sidebar)
2. Enable "Automated backups"
3. Choose backup frequency (daily recommended)

### Manual Backup

```bash
# Using pg_dump (requires PostgreSQL tools)
pg_dump postgresql://user:password@host:5432/postgres > backup.sql
```

---

## Troubleshooting

### Connection Issues

**Error: "Cannot connect to database"**
- Verify connection string is correct
- Check IP whitelist in Supabase Settings → Database
- Ensure environment variables are loaded

**Error: "Permission denied"**
- Check RLS policies are correctly configured
- Verify user role (admin vs intern)
- Check JWT token is valid

### Schema Issues

**Error: "Table already exists"**
- Drop existing tables first:
  ```sql
  DROP TABLE IF EXISTS audit_log CASCADE;
  DROP TABLE IF EXISTS passkey_registrations CASCADE;
  DROP TABLE IF EXISTS passkeys CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  DROP TABLE IF EXISTS certifications CASCADE;
  DROP TABLE IF EXISTS interns CASCADE;
  DROP TABLE IF EXISTS admin_settings CASCADE;
  ```
- Then re-run the schema script

**Error: "UUID extension not found"**
- Run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

### Performance Issues

**Slow queries on certifications?**
- Verify indexes are created:
  ```sql
  SELECT * FROM pg_indexes WHERE tablename = 'certifications';
  ```

**Too many connections?**
- Check connection pool settings in Supabase
- Implement connection pooling in backend

---

## API Endpoints (Backend Implementation)

Once your database is set up, implement these endpoints:

### Authentication
- `POST /auth/register` - Register with passkey
- `POST /auth/login` - Login with passkey
- `POST /auth/logout` - Logout

### Interns
- `GET /api/interns` - List all interns
- `GET /api/interns/:id` - Get intern details
- `POST /api/interns` - Create intern (admin only)
- `PUT /api/interns/:id` - Update intern (admin only)
- `DELETE /api/interns/:id` - Delete intern (admin only)

### Certifications
- `GET /api/certifications` - List certifications
- `GET /api/certifications/:id` - Get certification details
- `POST /api/certifications` - Add certification
- `PUT /api/certifications/:id` - Update certification
- `DELETE /api/certifications/:id` - Delete certification

### Admin
- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings` - Update settings (admin only)
- `GET /api/admin/audit-log` - View audit log (admin only)

---

## Security Checklist

- [ ] Environment variables are not committed to git
- [ ] Service role key is only used on backend
- [ ] Anon key is used on frontend
- [ ] RLS policies are enabled on all tables
- [ ] Passkeys are properly validated on backend
- [ ] Audit logging is enabled for admin actions
- [ ] Database backups are automated
- [ ] CORS is configured for your frontend domain
- [ ] Rate limiting is implemented on auth endpoints
- [ ] Passwords are hashed (if using password auth)

---

## Next Steps

1. ✅ Database schema created
2. ⏭️ Implement backend API endpoints
3. ⏭️ Set up passkey authentication
4. ⏭️ Connect frontend to Supabase
5. ⏭️ Test all CRUD operations
6. ⏭️ Deploy to production

---

## Support

- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- WebAuthn/Passkeys: https://webauthn.io/

---

**Last Updated**: April 2026
**Schema Version**: 1.0
