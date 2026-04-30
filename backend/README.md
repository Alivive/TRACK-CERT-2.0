# CerTrack Backend API

Express.js backend API for the CerTrack certification tracking system.

## Deployment on Render

### Step 1: Create Web Service
1. Go to Render Dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository: `https://github.com/Alivive/TRACK-CERT-2.0`

### Step 2: Configure Service
- **Name**: `certrack-backend`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Step 3: Environment Variables
Add these environment variables in Render:

```
SUPABASE_URL=https://fvhcafqipnpbktbpwwry.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2aGNhZnFpcG5wYmt0YnB3d3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDkyOTMsImV4cCI6MjA5MzEyNTI5M30.D-SZSkkQDS5wK4wTqxZrDTyYt85YL4CBqRRmKRbXQFY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2aGNhZnFpcG5wYmt0YnB3d3J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU0OTI5MywiZXhwIjoyMDkzMTI1MjkzfQ.649zZHy3mzKaAW-XjhfYdZ_7j3SlG4oBWBe3O3Tn3Eg
NODE_ENV=production
PORT=10000
```

### Step 4: Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Your API will be available at: `https://certrack-backend.onrender.com`

## API Endpoints

### Health Check
- `GET /` - Basic API info
- `GET /health` - Health check for monitoring
- `GET /api/test-connection` - Test Supabase connection

### Admin Settings
- `GET /api/admin-settings` - Get system settings
- `PUT /api/admin-settings` - Update system settings

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile

### Interns
- `GET /api/interns` - Get all interns
- `POST /api/interns` - Add new intern

### Certifications
- `GET /api/certifications` - Get all certifications
- `GET /api/certifications?intern_id=:id` - Get certifications for specific intern
- `POST /api/certifications` - Add new certification

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev

# Test connection
npm test
```

## Security Notes

- Service role key bypasses RLS policies
- All API endpoints use service role for admin operations
- CORS configured for frontend domain
- Environment variables must be set in Render dashboard