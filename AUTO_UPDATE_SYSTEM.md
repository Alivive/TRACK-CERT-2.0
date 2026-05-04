# CerTrack Auto-Update System

## Overview
Your PWA now has a **fully automatic update system** that detects and applies code changes without manual intervention, **while preserving user authentication and preferences**.

## How It Works

### 1. **Build-Time Version Tracking**
- Every build generates a unique timestamp via `VITE_BUILD_TIME`
- Stored in `frontend/src/utils/cacheVersion.js`
- Automatically increments with each deployment

### 2. **Smart Cache Clearing with Data Preservation**
When an update is detected, the system:
- ✅ **PRESERVES** Authentication tokens (Supabase session)
- ✅ **PRESERVES** User theme preferences
- ✅ **PRESERVES** User settings and preferences
- ❌ **CLEARS** Old JavaScript/CSS cache
- ❌ **CLEARS** Outdated offline data
- ❌ **CLEARS** Stale IndexedDB entries

**Result: Users stay logged in after updates!**

### 3. **Automatic Update Detection**
The system checks for updates in **3 ways**:

#### A. On App Load
- Checks cache version immediately when app starts
- Clears old cache if new version detected
- Shows notification to user

#### B. Periodic Checks (Every 30 seconds)
- Background process checks for new versions
- Automatically reloads if update found
- No user interaction needed

#### C. Service Worker Updates
- PWA service worker checks for updates every 60 seconds
- Uses `registerType: 'autoUpdate'` in Vite config
- Automatically skips waiting and claims clients

### 3. **User Experience**

#### Automatic Update (Default)
1. New code deployed → Build timestamp changes
2. User's app detects change within 30 seconds
3. Shows countdown notification: "Auto-updating in 10 seconds..."
4. User can click "Update Now" or wait
5. App automatically reloads after countdown
6. Old cache cleared, **user stays logged in** ✅
7. New version loaded with preserved preferences

#### What Users Experience
- ✅ **Stay logged in** - No re-authentication needed
- ✅ **Keep theme** - Dark/light mode preference preserved
- ✅ **Seamless update** - Just a quick reload
- ✅ **No data loss** - Settings and preferences intact

#### Manual Dismiss Option
- User can click "Later" to postpone
- Update will retry on next check (30 seconds)
- Eventually updates automatically

## Configuration Files

### `frontend/vite.config.js`
```javascript
VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  workbox: {
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true
  }
})
```

### `frontend/src/utils/cacheVersion.js`
- `CACHE_VERSION`: Build timestamp
- `UPDATE_CHECK_INTERVAL`: 30 seconds
- `checkAndClearOldCache()`: Clears old cache
- `forceUpdateIfNeeded()`: Forces reload if needed

### `frontend/src/components/PWAUpdatePrompt.jsx`
- Shows update notification
- 10-second countdown timer
- Auto-updates or manual trigger

### `frontend/src/App.jsx`
- Initializes cache check on load
- Sets up 30-second update interval
- Triggers service worker updates

## What Gets Updated Automatically

✅ **JavaScript/React Code** - All component changes
✅ **CSS Styles** - Design and layout updates
✅ **Assets** - Images, icons, fonts
✅ **Service Worker** - PWA functionality
✅ **Cache** - Clears old data automatically
✅ **IndexedDB** - Offline storage cleared

## What Gets Preserved (No Logout!)

✅ **Authentication Tokens** - Supabase session (all `sb-*` keys)
✅ **User Theme** - Dark/light mode preference
✅ **User Preferences** - Settings and customizations
✅ **Login State** - Users stay logged in after update

### Protected localStorage Keys
```javascript
const PRESERVE_KEYS = [
  'sb-',                    // Supabase auth tokens
  'supabase.auth.token',    // Legacy Supabase auth
  'certrack_cache_version', // Version tracker
  'theme',                  // User theme preference
  'user_preferences'        // User settings
];
```

## Deployment Workflow

1. **Make code changes** in your editor
2. **Build the app**: `npm run build`
3. **Deploy to Vercel/hosting**
4. **Users auto-update** within 30-60 seconds

No manual cache clearing needed!
No version number updates needed!
No user action required!

## Testing Auto-Update

### Local Testing
1. Run `npm run build` to create a production build
2. Run `npm run preview` to test the build
3. Make a code change
4. Run `npm run build` again
5. Refresh the preview - you'll see the update prompt

### Production Testing
1. Deploy current version
2. Make a small visible change (e.g., change a button text)
3. Deploy new version
4. Open the app on your phone/browser
5. Wait 30-60 seconds
6. Update notification appears automatically
7. App reloads with new changes

## Update Intervals

| Check Type | Interval | Purpose |
|------------|----------|---------|
| Cache Version | 30 seconds | Detect new builds |
| Service Worker | 60 seconds | Detect PWA updates |
| On App Load | Immediate | First-time check |

## Troubleshooting

### Updates Not Showing?
1. Check browser console for `[APP] Checking for updates...`
2. Verify new build was deployed (check timestamp)
3. Clear browser cache manually once: Ctrl+Shift+R
4. Check service worker in DevTools → Application → Service Workers

### Update Stuck?
1. Unregister service worker in DevTools
2. Clear all site data
3. Reload page
4. Service worker will re-register automatically

### Force Immediate Update
Users can manually trigger update:
1. Open browser DevTools (F12)
2. Go to Application → Service Workers
3. Click "Update" button
4. Or click "Unregister" and reload

## Benefits

✅ **Zero Manual Intervention** - Updates happen automatically
✅ **Fast Deployment** - Changes live within 60 seconds
✅ **User-Friendly** - Countdown gives users control
✅ **Cache Management** - Old data cleared automatically
✅ **Offline Support** - Works even when offline
✅ **Version Tracking** - Build timestamps prevent conflicts

## Security Notes

- Updates only apply from your domain
- Service worker validates origin
- No third-party code injection possible
- HTTPS required for service workers

## Future Enhancements

Consider adding:
- [ ] Update changelog display
- [ ] Silent updates during idle time
- [ ] Update size indicator
- [ ] Rollback mechanism
- [ ] A/B testing support

---

**Your app now updates automatically!** 🚀
Every code change you deploy will reach users within 30-60 seconds without any manual steps.
