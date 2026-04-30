# CerTrack Frontend Deployment Guide

## PWA-Ready Vercel Deployment

### Prerequisites
1. Backend deployed on Render: `https://track-cert-2-0.onrender.com`
2. Supabase project configured for authentication
3. GitHub repository updated with latest code
4. **PWA Features**: Service worker, manifest, offline support, install prompts

### Step 1: Connect to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import from GitHub: `https://github.com/Alivive/TRACK-CERT-2.0`
4. Select the repository

### Step 2: Configure Project
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Environment Variables
Add these environment variables in Vercel:

```
VITE_SUPABASE_URL=https://fvhcafqipnpbktbpwwry.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2aGNhZnFpcG5wYmt0YnB3d3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDkyOTMsImV4cCI6MjA5MzEyNTI5M30.D-SZSkkQDS5wK4wTqxZrDTyYt85YL4CBqRRmKRbXQFY
VITE_API_URL=https://track-cert-2-0.onrender.com
```

### Step 4: Deploy
1. Click "Deploy"
2. Vercel will build and deploy automatically
3. Your PWA will be available at: `https://your-project-name.vercel.app`

## 🚀 PWA Features Included

### ✅ Installability
- **Auto Install Prompt**: Shows after 3 seconds on supported browsers
- **iOS Instructions**: Manual installation guide for Safari users
- **Cross-Platform**: Works on desktop, mobile, and tablets
- **App Shortcuts**: Quick access to Dashboard, Add Cert, Admin Panel

### ✅ Offline Capabilities
- **Service Worker**: Caches app shell and static assets
- **Offline Fallback**: Custom offline page when no connection
- **Asset Caching**: Icons, CSS, JS cached for instant loading
- **Progressive Enhancement**: Works online and offline

### ✅ Native App Experience
- **Standalone Mode**: Runs without browser UI when installed
- **Theme Colors**: CerTrack red branding throughout
- **App Icons**: Full icon set (72px to 512px) using your logo
- **Splash Screen**: Branded loading experience

### ✅ Auto-Updates
- **Update Notifications**: Green prompt when new version available
- **One-Click Updates**: Seamless update with automatic reload
- **Background Updates**: Service worker updates automatically

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Vercel PWA)  │◄──►│   (Render)      │◄──►│  (Supabase)     │
│                 │    │                 │    │                 │
│ • React/Vite    │    │ • Express API   │    │ • PostgreSQL    │
│ • Service Worker│    │ • CRUD Ops      │    │ • RLS Policies  │
│ • PWA Manifest  │    │ • Service Role  │    │ • Auth System   │
│ • Install Prompt│    │ • CORS Config   │    │ • Real-time     │
│ • Offline Cache │    │ • API Endpoints │    │ • Secure        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Connection Flow

1. **Authentication**: Frontend ↔ Supabase (Direct)
   - Login/logout handled by Supabase Auth
   - JWT tokens managed automatically

2. **Data Operations**: Frontend ↔ Backend ↔ Supabase
   - All CRUD operations go through backend API
   - Backend uses service role key (bypasses RLS)
   - Frontend uses API client for all data requests

3. **PWA Features**:
   - Service worker caches static assets
   - Install prompts appear automatically
   - Offline fallback for network issues
   - Auto-updates when new version deployed

## Post-Deployment Steps

1. **Test PWA Installation**:
   - Visit your Vercel URL in Chrome/Edge
   - Look for install prompt in address bar
   - Test "Add to Home Screen" on mobile

2. **Verify Offline Functionality**:
   - Install the PWA
   - Disconnect internet
   - App should still load with cached content

3. **Check Service Worker**:
   - Open DevTools → Application → Service Workers
   - Verify service worker is registered and active

4. **Test Auto-Updates**:
   - Deploy a new version
   - Visit app - should show green update prompt

## PWA Installation Instructions

### Chrome/Edge (Desktop & Android)
1. Visit CerTrack in Chrome/Edge
2. Look for install icon in address bar or wait for prompt
3. Click "Install" to add to desktop/home screen

### Safari (iOS)
1. Open CerTrack in Safari
2. Tap Share button → "Add to Home Screen"
3. Tap "Add" to install

### Firefox
1. Visit CerTrack in Firefox
2. Click install icon in address bar
3. Click "Install" to add to desktop

## Environment Variables Explained

- `VITE_SUPABASE_URL`: Your Supabase project URL (for auth only)
- `VITE_SUPABASE_ANON_KEY`: Public key for authentication (safe for browser)
- `VITE_API_URL`: Your backend API URL on Render

## Troubleshooting

### PWA Not Installing
- Ensure HTTPS is enabled (Vercel provides this automatically)
- Check manifest.json is accessible at `/manifest.json`
- Verify service worker is registered in DevTools

### Service Worker Issues
- Clear browser cache and reload
- Check DevTools → Application → Service Workers
- Ensure no console errors during registration

### Offline Mode Not Working
- Verify service worker is caching resources
- Check Network tab in DevTools for cached responses
- Test with airplane mode or network throttling

### Update Prompt Not Showing
- Deploy a new version to trigger update
- Check service worker update cycle in DevTools
- Clear cache if update seems stuck

## PWA Audit Checklist

After deployment, your PWA should score:
- ✅ **Installable**: Manifest + Service Worker
- ✅ **Offline**: Cached resources + offline fallback
- ✅ **Fast**: Service worker caching
- ✅ **Secure**: HTTPS (Vercel default)
- ✅ **Responsive**: Mobile-friendly design
- ✅ **Accessible**: Semantic HTML + ARIA

**CerTrack is now a full Progressive Web App! 🎉**