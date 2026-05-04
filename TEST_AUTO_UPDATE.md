# Testing Auto-Update Without Logout

## Quick Test Checklist

### ✅ Pre-Update Test
1. Open the app in browser
2. Log in with your credentials
3. Change theme to Light mode (or Dark if already light)
4. Open browser DevTools (F12) → Console
5. Check localStorage: `localStorage.getItem('theme')`
6. Check auth: Look for keys starting with `sb-` in Application → Storage → Local Storage
7. Note your current login state

### 🔄 Deploy Update
1. Make a visible change (e.g., change a button text in Dashboard.jsx)
2. Build: `npm run build`
3. Deploy to Vercel/hosting
4. Wait for deployment to complete

### ✅ Post-Update Test
1. Wait 30-60 seconds (or refresh the page)
2. Update notification should appear
3. Click "Update Now" or wait for countdown
4. App reloads automatically
5. **CHECK: Are you still logged in?** ✅
6. **CHECK: Is your theme still the same?** ✅
7. **CHECK: Can you see the new changes?** ✅

## Expected Results

### ✅ PASS Criteria
- User stays logged in after update
- Theme preference preserved
- New code changes visible
- No errors in console
- Smooth reload experience

### ❌ FAIL Criteria
- User logged out (needs to re-enter credentials)
- Theme reset to default
- Update doesn't apply
- Console errors about auth

## Console Logs to Watch For

### Good Logs ✅
```
[CACHE] New build detected. Clearing old cache...
[CACHE] Preserving: sb-xxxxxxxx-auth-token
[CACHE] Preserving: theme
[CACHE] ✅ Cache cleared. Auth & preferences preserved.
[APP] Old cache cleared due to version update
```

### Bad Logs ❌
```
[AUTH] Session expired
[AUTH] User logged out
Error: No auth token found
```

## Manual Testing Steps

### Test 1: Login Persistence
1. Log in to the app
2. Open DevTools → Application → Local Storage
3. Copy the value of any `sb-` key (your auth token)
4. Trigger an update (deploy new code)
5. After update, check if the same `sb-` key still exists
6. **PASS**: Key exists with same value
7. **FAIL**: Key is missing or different

### Test 2: Theme Persistence
1. Set theme to Light mode
2. Check: `localStorage.getItem('theme')` should return `"light"`
3. Trigger an update
4. After update, check: `localStorage.getItem('theme')`
5. **PASS**: Still returns `"light"`
6. **FAIL**: Returns `"dark"` or `null`

### Test 3: Session Validity
1. Log in and navigate to Dashboard
2. Trigger an update
3. After update, try to:
   - Add a certification
   - View intern profiles
   - Access admin panel (if admin)
4. **PASS**: All actions work without re-login
5. **FAIL**: Gets "Unauthorized" or redirected to login

## Debugging Failed Tests

### If Users Get Logged Out

1. **Check localStorage preservation:**
   ```javascript
   // In browser console BEFORE update
   console.log('Auth keys:', Object.keys(localStorage).filter(k => k.startsWith('sb-')));
   
   // AFTER update
   console.log('Auth keys:', Object.keys(localStorage).filter(k => k.startsWith('sb-')));
   ```

2. **Check cacheVersion.js:**
   - Verify `PRESERVE_KEYS` includes `'sb-'`
   - Check if backup/restore logic is working

3. **Check Supabase config:**
   - Verify `persistSession: true` in supabaseClient.js
   - Check if Supabase is using localStorage (not sessionStorage)

### If Theme Gets Reset

1. **Check if 'theme' is in PRESERVE_KEYS:**
   ```javascript
   // In cacheVersion.js
   const PRESERVE_KEYS = [
     'sb-',
     'theme', // ← Should be here
     // ...
   ];
   ```

2. **Check ThemeContext:**
   - Verify it reads from localStorage on mount
   - Check if default value is correct

## Production Testing

### Real-World Test Scenario
1. **Day 1**: Deploy app, users log in
2. **Day 2**: Make code changes, deploy update
3. **Monitor**: Check if users report being logged out
4. **Success**: No logout complaints, users continue working
5. **Failure**: Users complain about re-login after update

### Monitoring Checklist
- [ ] No increase in login events after deployment
- [ ] No support tickets about "logged out after update"
- [ ] Users report seeing new features without issues
- [ ] Analytics show continuous session (no session breaks)

## Emergency Rollback

If users are getting logged out:

1. **Quick Fix**: Remove cache clearing temporarily
   ```javascript
   // In cacheVersion.js
   export const checkAndClearOldCache = async () => {
     // Comment out the clearing logic temporarily
     return false;
   };
   ```

2. **Deploy hotfix** immediately

3. **Investigate** the issue offline

4. **Fix** the preservation logic

5. **Re-enable** cache clearing with proper preservation

## Success Metrics

### Week 1 After Implementation
- [ ] 0 logout complaints
- [ ] Users see updates automatically
- [ ] No auth-related errors in logs
- [ ] Theme preferences maintained
- [ ] Smooth update experience reported

### Long-Term Success
- [ ] Updates deploy seamlessly
- [ ] Users never mention being logged out
- [ ] No manual cache clearing needed
- [ ] Professional app experience maintained

---

**Expected Outcome**: Users should NEVER notice they're being logged out. Updates should be invisible except for the brief update notification and reload.
