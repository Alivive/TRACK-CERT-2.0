# CerTrack Deployment Checklist

## 🎯 Deployment Architecture
- **Frontend**: Vercel (React/Vite)
- **Backend**: Render (Express API)  
- **Database**: Supabase (PostgreSQL)

## ✅ Completed Preparations

### Backend (Ready for Render)
- ✅ Express server created (`backend/server.js`)
- ✅ Full REST API with all endpoints
- ✅ CORS configured for Vercel domains
- ✅ Environment variables documented
- ✅ Package.json configured for deployment
- ✅ .gitignore protecting secrets

### Frontend (Ready for Vercel)
- ✅ API client created for backend communication
- ✅ DatabaseContext updated to use backend API
- ✅ AdminPanel updated to use backend API
- ✅ Environment variables configured
- ✅ Vercel.json configuration added
- ✅ .env.example created for deployment

### Security
- ✅ Sensitive data in .env.local files (not committed)
- ✅ .gitignore protecting all secrets
- ✅ Service role key only in backend
- ✅ Public keys only in frontend

## 🚀 Deployment Steps

### 1. Deploy Backend to Render
1. Go to Render Dashboard → "Web Services"
2. Connect GitHub repo: `https://github.com/Alivive/TRACK-CERT-2.0`
3. Configure:
   - **Name**: `certrack-backend`
   - **Environment**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   ```
   SUPABASE_URL=https://fvhcafqipnpbktbpwwry.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2aGNhZnFpcG5wYmt0YnB3d3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDkyOTMsImV4cCI6MjA5MzEyNTI5M30.D-SZSkkQDS5wK4wTqxZrDTyYt85YL4CBqRRmKRbXQFY
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2aGNhZnFpcG5wYmt0YnB3d3J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU0OTI5MywiZXhwIjoyMDkzMTI1MjkzfQ.649zZHy3mzKaAW-XjhfYdZ_7j3SlG4oBWBe3O3Tn3Eg
   NODE_ENV=production
   ```
5. Deploy and note the URL: `https://certrack-backend.onrender.com`

### 2. Deploy Frontend to Vercel
1. Go to Vercel Dashboard → "New Project"
2. Import GitHub repo: `https://github.com/Alivive/TRACK-CERT-2.0`
3. Configure:
   - **Framework**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   ```
   VITE_SUPABASE_URL=https://fvhcafqipnpbktbpwwry.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2aGNhZnFpcG5wYmt0YnB3d3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDkyOTMsImV4cCI6MjA5MzEyNTI5M30.D-SZSkkQDS5wK4wTqxZrDTyYt85YL4CBqRRmKRbXQFY
   VITE_API_URL=https://track-cert-2-0.onrender.com
   ```
5. Deploy and note the URL: `https://your-project.vercel.app`

## 🔧 Post-Deployment Configuration

### Update Backend CORS (if needed)
If you get CORS errors, add your Vercel domain to backend environment:
```
FRONTEND_URL=https://your-project.vercel.app
```

### Test Deployment
1. **Backend Health**: Visit `https://certrack-backend.onrender.com/health`
2. **API Test**: Visit `https://certrack-backend.onrender.com/api/test-connection`
3. **Frontend**: Visit your Vercel URL and test login
4. **Full Flow**: Login → Admin Panel → Load Settings

## 🔒 Security Notes
- ✅ Service role key only on backend (never in frontend)
- ✅ All secrets in environment variables (not code)
- ✅ CORS properly configured
- ✅ RLS policies active in Supabase

## 📊 Connection Flow
```
User Browser → Vercel Frontend → Render Backend → Supabase Database
     ↓              ↓              ↓              ↓
  React App    →  API Client  →  Express API  →  PostgreSQL
  Auth UI      →  HTTP Calls  →  Service Role →  RLS Bypass
```

## 🎉 Ready to Deploy!
All files are prepared and ready. You can now deploy both services and they will work together seamlessly.