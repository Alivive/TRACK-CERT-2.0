# CerTrack Database & Backend Quick Start

## 📋 Overview

This quick start guide will get your CerTrack system up and running with Supabase in 30 minutes.

---

## ✅ Checklist

### Phase 1: Database Setup (10 minutes)

- [ ] **Create Supabase Project**
  - Go to https://supabase.com
  - Click "New Project"
  - Fill in project details
  - Wait for initialization

- [ ] **Run SQL Schema**
  - Open Supabase SQL Editor
  - Copy contents of `supabase_schema.sql`
  - Paste and run
  - Verify all tables created

- [ ] **Get Connection Details**
  - Go to Settings → Database
  - Copy PostgreSQL connection string
  - Go to Settings → API
  - Copy Project URL and Anon Key

### Phase 2: Environment Setup (5 minutes)

- [ ] **Create Backend .env**
  ```bash
  # backend/.env.local
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  WEBAUTHN_RP_ID=localhost
  WEBAUTHN_RP_NAME=CerTrack
  WEBAUTHN_ORIGIN=http://localhost:5173
  ADMIN_CODE=ADMIN2026
  INTERN_CODE=INTERNS2026
  ```

- [ ] **Create Frontend .env**
  ```bash
  # frontend/.env.local
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```

### Phase 3: Backend Setup (10 minutes)

- [ ] **Install Dependencies**
  ```bash
  cd backend
  npm install
  ```

- [ ] **Implement API Endpoints**
  - Copy code from `PASSKEY_IMPLEMENTATION.md`
  - Create `server.js` with auth endpoints
  - Create route handlers for CRUD operations

- [ ] **Test Connection**
  ```bash
  npm start
  # Should see: "Server running on port 3000"
  ```

- [ ] **Verify Database Connection**
  ```bash
  curl http://localhost:3000/health
  # Should return: { "status": "ok" }
  ```

### Phase 4: Frontend Setup (5 minutes)

- [ ] **Install Dependencies**
  ```bash
  cd frontend
  npm install
  ```

- [ ] **Update Supabase Client**
  - Edit `frontend/src/utils/supabaseClient.js`
  - Use environment variables

- [ ] **Implement Auth Components**
  - Copy `PasskeyRegister.jsx` from `PASSKEY_IMPLEMENTATION.md`
  - Copy `PasskeyLogin.jsx` from `PASSKEY_IMPLEMENTATION.md`
  - Add to login page

- [ ] **Test Frontend**
  ```bash
  npm run dev
  # Should see: "Local: http://localhost:5173"
  ```

---

## 🚀 First Run

### 1. Start Backend
```bash
cd backend
npm start
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Test Registration
1. Go to http://localhost:5173/register
2. Enter email: `test@example.com`
3. Enter access code: `INTERNS2026`
4. Select role: `intern`
5. Click "Register with Passkey"
6. Create passkey on your device
7. Should redirect to login

### 4. Test Login
1. Go to http://localhost:5173/login
2. Enter email: `test@example.com`
3. Click "Login with Passkey"
4. Authenticate with passkey
5. Should redirect to dashboard

---

## 📊 Database Schema Summary

### Tables Created

| Table | Purpose | Records |
|-------|---------|---------|
| `admin_settings` | System config | 1 (default) |
| `interns` | Intern profiles | 0 (empty) |
| `certifications` | Certifications | 0 (empty) |
| `users` | User accounts | 0 (empty) |
| `passkeys` | WebAuthn credentials | 0 (empty) |
| `passkey_registrations` | Temp registration data | 0 (empty) |
| `audit_log` | Admin action tracking | 0 (empty) |

### Initial Data

**admin_settings** (1 row):
```
project_name: "CerTrack Africa"
admin_code: "ADMIN2026"
intern_code: "INTERNS2026"
```

**All other tables**: Empty (no users created initially)

---

## 🔑 Access Codes

Use these codes during registration:

| Role | Code | Purpose |
|------|------|---------|
| Admin | `ADMIN2026` | Create admin account |
| Intern | `INTERNS2026` | Create intern account |

**Change codes in Supabase:**
```sql
UPDATE admin_settings 
SET admin_code = 'NEW_ADMIN_CODE',
    intern_code = 'NEW_INTERN_CODE'
WHERE id = 1;
```

---

## 🧪 Testing Endpoints

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

### Test Database
```bash
curl http://localhost:3000/api/interns \
  -H "Authorization: Bearer <jwt-token>"
```

---

## 📁 File Structure

```
backend/
├── supabase_schema.sql          # Database schema
├── SUPABASE_SETUP_GUIDE.md      # Detailed setup
├── PASSKEY_IMPLEMENTATION.md    # Auth implementation
├── API_REFERENCE.md             # API docs
├── QUICK_START.md               # This file
├── server.js                    # Main server (create this)
├── .env.local                   # Environment variables (create this)
└── package.json

frontend/
├── src/
│   ├── components/
│   │   ├── PasskeyRegister.jsx  # Registration component
│   │   ├── PasskeyLogin.jsx     # Login component
│   │   └── ...
│   ├── utils/
│   │   ├── supabaseClient.js    # Supabase client
│   │   └── ...
│   └── ...
├── .env.local                   # Environment variables (create this)
└── package.json
```

---

## 🔧 Common Issues

### "Cannot connect to Supabase"
- ✅ Check SUPABASE_URL is correct
- ✅ Check SUPABASE_SERVICE_ROLE_KEY is correct
- ✅ Verify internet connection
- ✅ Check Supabase project is running

### "Table already exists"
- ✅ Drop tables first (see SUPABASE_SETUP_GUIDE.md)
- ✅ Re-run schema script

### "Passkey not supported"
- ✅ Use HTTPS (or localhost for dev)
- ✅ Use modern browser (Chrome 67+, Safari 13+, Edge 18+)
- ✅ Check browser console for errors

### "JWT token invalid"
- ✅ Verify token is not expired
- ✅ Check token format in Authorization header
- ✅ Verify JWT_SECRET matches backend

### "CORS error"
- ✅ Check WEBAUTHN_ORIGIN matches frontend URL
- ✅ Verify backend CORS configuration
- ✅ Check frontend is on correct port

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `supabase_schema.sql` | Complete database schema |
| `SUPABASE_SETUP_GUIDE.md` | Detailed setup instructions |
| `PASSKEY_IMPLEMENTATION.md` | WebAuthn implementation guide |
| `API_REFERENCE.md` | Complete API documentation |
| `QUICK_START.md` | This file |

---

## 🎯 Next Steps

After completing quick start:

1. **Implement Full Backend**
   - Create all API endpoints
   - Add error handling
   - Implement rate limiting
   - Add logging

2. **Implement Full Frontend**
   - Connect all pages to API
   - Add error handling
   - Implement loading states
   - Add form validation

3. **Add Features**
   - PDF report generation
   - Data import/export
   - Email notifications
   - Admin dashboard

4. **Security**
   - Enable HTTPS
   - Set up firewall rules
   - Configure backups
   - Enable audit logging

5. **Testing**
   - Write unit tests
   - Write integration tests
   - Load testing
   - Security testing

6. **Deployment**
   - Deploy backend (Heroku, Railway, etc.)
   - Deploy frontend (Vercel, Netlify, etc.)
   - Configure production database
   - Set up monitoring

---

## 💡 Tips

- **Development**: Use `npm run dev` for hot reload
- **Testing**: Use Postman or Insomnia for API testing
- **Debugging**: Check browser console and server logs
- **Database**: Use Supabase SQL Editor for queries
- **Backups**: Enable automated backups in Supabase
- **Monitoring**: Set up error tracking (Sentry, etc.)

---

## 📞 Support

- **Supabase Docs**: https://supabase.com/docs
- **WebAuthn Docs**: https://webauthn.io/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **SimpleWebAuthn**: https://simplewebauthn.dev/

---

## ✨ You're Ready!

Your CerTrack system is now ready to use. Start with the quick start checklist above and refer to the detailed documentation as needed.

**Happy coding! 🚀**

---

**Last Updated**: April 2026
**Version**: 1.0
