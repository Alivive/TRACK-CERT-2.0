# CerTrack Backend & Database Setup

## 📖 Overview

This directory contains all the SQL schema, documentation, and implementation guides for setting up the CerTrack certification tracking system with Supabase.

**Key Features:**
- ✅ Complete PostgreSQL schema with 7 tables
- ✅ WebAuthn/Passkey authentication (no passwords)
- ✅ Role-based access control (admin/intern)
- ✅ Audit logging for compliance
- ✅ Row-level security policies
- ✅ Comprehensive API documentation
- ✅ **NO users created initially - only passkeys**

---

## 📁 Files in This Directory

### 1. **supabase_schema.sql** (MAIN FILE)
The complete database schema. Run this in Supabase SQL Editor to create all tables.

**What it creates:**
- `admin_settings` - System configuration
- `interns` - Intern profiles
- `certifications` - Certification records
- `users` - User accounts (empty initially)
- `passkeys` - WebAuthn credentials
- `passkey_registrations` - Temporary registration data
- `audit_log` - Admin action tracking
- Views, triggers, and indexes
- Row-level security policies

**How to use:**
1. Go to Supabase SQL Editor
2. Create new query
3. Copy entire contents of this file
4. Paste and run
5. Verify success

---

### 2. **QUICK_START.md** (START HERE)
30-minute quick start guide to get everything running.

**Includes:**
- Step-by-step checklist
- Environment setup
- First run instructions
- Testing endpoints
- Common issues & fixes

**Best for:** Getting up and running quickly

---

### 3. **SUPABASE_SETUP_GUIDE.md** (DETAILED)
Comprehensive setup guide with detailed explanations.

**Includes:**
- Prerequisites
- Project creation
- Schema deployment
- Connection configuration
- RLS setup
- Backup & recovery
- Troubleshooting
- Security checklist

**Best for:** Understanding the full setup process

---

### 4. **PASSKEY_IMPLEMENTATION.md** (TECHNICAL)
Complete guide to implementing WebAuthn passkey authentication.

**Includes:**
- Architecture overview
- Database schema details
- Backend implementation (Node.js)
- Frontend implementation (React)
- Registration flow
- Authentication flow
- Security best practices
- Testing guide

**Best for:** Implementing authentication

---

### 5. **API_REFERENCE.md** (REFERENCE)
Complete API documentation for all endpoints.

**Includes:**
- Authentication endpoints
- Interns CRUD endpoints
- Certifications CRUD endpoints
- Admin endpoints
- Error responses
- Rate limiting
- Pagination & filtering
- Example requests/responses

**Best for:** Building API clients

---

### 6. **README.md** (THIS FILE)
Overview and navigation guide.

---

## 🚀 Quick Start (5 Steps)

### Step 1: Create Supabase Project
```
1. Go to https://supabase.com
2. Click "New Project"
3. Fill in details and wait for initialization
```

### Step 2: Run SQL Schema
```
1. Open Supabase SQL Editor
2. Copy contents of supabase_schema.sql
3. Paste and run
4. Verify all tables created
```

### Step 3: Get Connection Details
```
1. Settings → Database → Copy PostgreSQL URI
2. Settings → API → Copy Project URL & Anon Key
3. Save to .env files
```

### Step 4: Set Up Backend
```bash
cd backend
npm install
# Implement server.js using PASSKEY_IMPLEMENTATION.md
npm start
```

### Step 5: Set Up Frontend
```bash
cd frontend
npm install
# Update supabaseClient.js with connection details
npm run dev
```

---

## 📊 Database Schema

### Tables Overview

```
admin_settings (1 row)
├── project_name
├── admin_code
└── intern_code

interns (many)
├── id (UUID)
├── first_name
├── last_name
├── email (UNIQUE)
├── start_date
└── timestamps

certifications (many)
├── id (UUID)
├── intern_id (FK → interns)
├── name
├── provider
├── category (AI, FE, BE, API, CYBER, CLOUD, SOFT)
├── hours
├── date
└── timestamps

users (many)
├── id (UUID)
├── email (UNIQUE)
├── password_hash (optional)
├── full_name
├── role (admin | intern)
├── intern_id (FK → interns)
└── timestamps

passkeys (many)
├── id (UUID)
├── user_id (FK → users)
├── credential_id (UNIQUE)
├── public_key
├── sign_count
├── transports
├── backup_eligible
├── backup_state
├── attestation_type
└── timestamps

passkey_registrations (temporary)
├── id (UUID)
├── email
├── role
├── challenge
└── expires_at

audit_log (many)
├── id (UUID)
├── user_id (FK → users)
├── action
├── table_name
├── record_id
├── old_values (JSONB)
├── new_values (JSONB)
├── ip_address
├── user_agent
└── created_at
```

### Relationships

```
users (1) ──── (1) interns
  └─ role: admin → no intern_id
  └─ role: intern → has intern_id

interns (1) ──── (N) certifications
  └─ Cascade delete

users (1) ──── (N) passkeys
  └─ Cascade delete

users (1) ──── (N) audit_log
  └─ Set null on delete
```

---

## 🔑 Initial Data

### admin_settings (1 row)
```sql
project_name: "CerTrack Africa"
admin_code: "ADMIN2026"
intern_code: "INTERNS2026"
```

### All Other Tables
**Empty** - No users created initially, only passkeys will be added during registration.

---

## 🔐 Authentication

### Passkey Registration Flow
```
1. User enters email + access code
2. Server generates challenge
3. User creates passkey on device
4. Device returns credential
5. Server stores passkey + creates user
6. User is registered
```

### Passkey Login Flow
```
1. User enters email
2. Server generates challenge
3. User authenticates with passkey
4. Device signs challenge
5. Server verifies signature
6. User is logged in
```

### Access Codes
- **Admin**: `ADMIN2026`
- **Intern**: `INTERNS2026`

Change in Supabase:
```sql
UPDATE admin_settings 
SET admin_code = 'NEW_CODE',
    intern_code = 'NEW_CODE'
WHERE id = 1;
```

---

## 📋 Implementation Checklist

### Database Setup
- [ ] Create Supabase project
- [ ] Run supabase_schema.sql
- [ ] Verify all tables created
- [ ] Get connection details
- [ ] Test connection

### Backend Setup
- [ ] Install dependencies
- [ ] Create .env.local file
- [ ] Implement auth endpoints (PASSKEY_IMPLEMENTATION.md)
- [ ] Implement CRUD endpoints (API_REFERENCE.md)
- [ ] Test all endpoints
- [ ] Add error handling
- [ ] Add logging

### Frontend Setup
- [ ] Install dependencies
- [ ] Create .env.local file
- [ ] Update supabaseClient.js
- [ ] Implement PasskeyRegister component
- [ ] Implement PasskeyLogin component
- [ ] Connect pages to API
- [ ] Test registration flow
- [ ] Test login flow

### Security
- [ ] Enable HTTPS
- [ ] Configure CORS
- [ ] Set up rate limiting
- [ ] Enable RLS policies
- [ ] Configure backups
- [ ] Enable audit logging
- [ ] Review security checklist

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] API tests
- [ ] Security tests
- [ ] Load tests

### Deployment
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Configure production database
- [ ] Set up monitoring
- [ ] Set up error tracking

---

## 🧪 Testing

### Test Database Connection
```bash
# From backend
curl http://localhost:3000/health
```

### Test Registration
```bash
curl -X POST http://localhost:3000/auth/register/start \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "accessCode": "INTERNS2026",
    "role": "intern"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:3000/auth/login/start \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Test API
```bash
curl http://localhost:3000/api/interns \
  -H "Authorization: Bearer <jwt-token>"
```

---

## 🔧 Environment Variables

### Backend (.env.local)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=CerTrack
WEBAUTHN_ORIGIN=http://localhost:5173
ADMIN_CODE=ADMIN2026
INTERN_CODE=INTERNS2026
NODE_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret
```

### Frontend (.env.local)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📚 Documentation Map

```
START HERE
    ↓
QUICK_START.md (30 min setup)
    ↓
Choose your path:
    ├─→ SUPABASE_SETUP_GUIDE.md (detailed setup)
    ├─→ PASSKEY_IMPLEMENTATION.md (auth implementation)
    └─→ API_REFERENCE.md (API endpoints)
```

---

## 🎯 Key Features

### ✅ Database
- PostgreSQL with Supabase
- 7 tables with proper relationships
- Indexes for performance
- Views for common queries
- Triggers for automatic timestamps

### ✅ Authentication
- WebAuthn/Passkey support
- No passwords required
- Secure challenge-response flow
- Sign count verification
- Backup eligibility tracking

### ✅ Authorization
- Role-based access control (admin/intern)
- Row-level security policies
- Audit logging
- Permission enforcement

### ✅ Data Management
- CRUD operations for all entities
- Pagination and filtering
- Sorting and searching
- Bulk operations support

### ✅ Security
- HTTPS required
- CORS configured
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

---

## 🚨 Important Notes

### ⚠️ NO USERS INITIALLY
The system is designed with **NO users created initially**. Users are created during passkey registration.

### ⚠️ PASSKEYS ONLY
The system uses WebAuthn passkeys for authentication. No passwords are stored.

### ⚠️ ENVIRONMENT VARIABLES
Never commit `.env.local` files to git. Add to `.gitignore`.

### ⚠️ SERVICE ROLE KEY
The service role key should only be used on the backend. Never expose it to the frontend.

### ⚠️ HTTPS REQUIRED
Passkeys require HTTPS (or localhost for development).

---

## 📞 Support & Resources

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [WebAuthn Spec](https://www.w3.org/TR/webauthn-2/)
- [SimpleWebAuthn](https://simplewebauthn.dev/)

### Tools
- [Supabase Dashboard](https://app.supabase.com)
- [Postman](https://www.postman.com/) - API testing
- [pgAdmin](https://www.pgadmin.org/) - Database management
- [WebAuthn.io](https://webauthn.io/) - WebAuthn testing

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Apr 2026 | Initial release |

---

## 📄 License

This project is part of CerTrack. All rights reserved.

---

## 🎉 Ready to Start?

1. **First time?** → Read [QUICK_START.md](./QUICK_START.md)
2. **Need details?** → Read [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md)
3. **Implementing auth?** → Read [PASSKEY_IMPLEMENTATION.md](./PASSKEY_IMPLEMENTATION.md)
4. **Building API?** → Read [API_REFERENCE.md](./API_REFERENCE.md)

---

**Last Updated**: April 2026
**Status**: Ready for Production
