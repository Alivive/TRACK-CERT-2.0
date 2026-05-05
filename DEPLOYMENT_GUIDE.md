# Deployment Guide - Bulk Certificate Attachment System

## 📋 Pre-Deployment Checklist

### Backend Setup
- [ ] Verify `backend/server.js` has file upload endpoints (lines 344-420)
- [ ] Verify `backend/package.json` has `multer` and `uuid` dependencies
- [ ] Verify `.env.local` has Supabase credentials:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`

### Frontend Setup
- [ ] Verify `frontend/src/pages/BulkAttachCertificates.jsx` exists
- [ ] Verify `frontend/src/App.jsx` has routing for `bulk_attach`
- [ ] Verify `frontend/src/components/Sidebar.jsx` has menu item
- [ ] Verify `.env.local` has `VITE_API_URL` pointing to backend

### Database Setup
- [ ] Supabase project created and configured
- [ ] `certifications` table exists with columns:
  - `id` (UUID)
  - `name` (TEXT)
  - `provider` (TEXT)
  - `date` (TEXT)
  - `intern_id` (UUID)
  - `certificate_file_url` (TEXT) - **NEW**
  - `certificate_url` (TEXT) - **NEW**
- [ ] Storage bucket `certificate-attachments` created

---

## 🚀 Deployment Steps

### Step 1: Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add certificate_file_url column to certifications table
ALTER TABLE certifications 
ADD COLUMN IF NOT EXISTS certificate_file_url TEXT;

-- Add certificate_url column if it doesn't exist
ALTER TABLE certifications 
ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN certifications.certificate_file_url 
IS 'URL to uploaded certificate file (PDF/image) stored in Supabase Storage';

COMMENT ON COLUMN certifications.certificate_url 
IS 'Direct website URL to online certificate (e.g., Coursera, LinkedIn Learning)';
```

**Expected Result**: ✅ No errors, columns added successfully

### Step 2: Create Storage Bucket

In Supabase Storage:

1. Click **"Create a new bucket"**
2. Name: `certificate-attachments`
3. Privacy: **Public** (for file access)
4. Click **"Create bucket"**

**Expected Result**: ✅ Bucket created and accessible

### Step 3: Deploy Backend

```bash
# Install dependencies
cd backend
npm install

# Verify server starts
npm start
```

**Expected Result**: ✅ Server running on port 3000

### Step 4: Deploy Frontend

```bash
# Build frontend
cd frontend
npm run build

# Verify build succeeds
# Check dist/ folder created
```

**Expected Result**: ✅ Build completes without errors

### Step 5: Test File Upload

1. Start backend: `npm start` (in backend folder)
2. Start frontend: `npm run dev` (in frontend folder)
3. Login to application
4. Go to **"Attach Files"** menu
5. Select 1-5 test files
6. Verify auto-matching works
7. Click upload and verify success

**Expected Result**: ✅ Files uploaded and data synced

---

## 🔍 Verification Checklist

### Backend Verification
```bash
# Check if endpoint responds
curl -X GET http://localhost:3000/health

# Expected response:
# {"status":"ok","message":"CerTrack Backend API is running","timestamp":"..."}
```

### Frontend Verification
- [ ] "Attach Files" menu item visible in sidebar
- [ ] Page loads without errors
- [ ] File selection works
- [ ] Auto-matching displays suggestions
- [ ] Upload button functions
- [ ] Progress tracking shows
- [ ] Success message displays

### Database Verification
```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'certifications' 
AND column_name IN ('certificate_file_url', 'certificate_url');

-- Expected: 2 rows with TEXT data type
```

### Storage Verification
- [ ] Bucket `certificate-attachments` exists
- [ ] Bucket is public
- [ ] Can upload test file
- [ ] Can access file via public URL

---

## 📊 Performance Testing

### Test Scenario 1: Small Batch (5 files)
- **Expected Time**: 1-2 minutes
- **Success Rate**: 100%
- **Auto-Match Rate**: 80-90%

### Test Scenario 2: Medium Batch (25 files)
- **Expected Time**: 3-5 minutes
- **Success Rate**: 100%
- **Auto-Match Rate**: 80-90%

### Test Scenario 3: Large Batch (50+ files)
- **Expected Time**: 7-15 minutes
- **Success Rate**: 95-100%
- **Auto-Match Rate**: 80-90%

---

## 🐛 Troubleshooting

### Issue: "Failed to upload certificate file"
**Solution**:
- Check Supabase Storage bucket exists
- Verify bucket is public
- Check file size (max 5MB)
- Check file format (PDF, JPG, PNG, WEBP)

### Issue: "Auto-match not working"
**Solution**:
- Rename files to match certification names
- Check certification names in database
- Verify auto-match toggle is enabled

### Issue: "Data not syncing after upload"
**Solution**:
- Click "SYNC DATA" button manually
- Check internet connection
- Verify backend is running
- Check browser console for errors

### Issue: "Upload timeout"
**Solution**:
- Reduce batch size (upload 20-30 files at a time)
- Change upload speed to "Slow"
- Check internet connection
- Verify backend is responsive

### Issue: "Files not appearing in profiles"
**Solution**:
- Refresh page (Ctrl+R or Cmd+R)
- Click "SYNC DATA" button
- Check browser cache
- Verify database migration ran

---

## 📈 Monitoring

### Key Metrics to Monitor
- Upload success rate (target: >95%)
- Average upload time per file
- Auto-match accuracy (target: >80%)
- Error rate (target: <5%)
- User feedback and issues

### Logs to Check
- Backend: `server.js` console output
- Frontend: Browser console (F12)
- Database: Supabase logs
- Storage: Supabase Storage activity

---

## 🔐 Security Checklist

- [ ] File type validation enabled (MIME type checking)
- [ ] File size limit enforced (5MB)
- [ ] Storage bucket is public (for file access)
- [ ] Database credentials in `.env.local` (not committed)
- [ ] API endpoints require authentication
- [ ] Old files cleaned up on update
- [ ] No sensitive data in filenames

---

## 📞 Support & Rollback

### If Issues Occur
1. Check troubleshooting section above
2. Review logs in browser console and backend
3. Verify database migration completed
4. Test with small file batch first

### Rollback Plan
If critical issues occur:
1. Stop accepting new uploads
2. Revert database migration (remove columns)
3. Revert frontend/backend code
4. Investigate root cause
5. Deploy fix and test thoroughly

---

## ✅ Post-Deployment

### Day 1
- [ ] Monitor upload success rate
- [ ] Check for user errors/issues
- [ ] Verify data syncing works
- [ ] Test with real user data

### Week 1
- [ ] Gather user feedback
- [ ] Monitor performance metrics
- [ ] Check storage usage
- [ ] Verify no data loss

### Ongoing
- [ ] Monitor upload success rate
- [ ] Track storage usage
- [ ] Update documentation as needed
- [ ] Plan future enhancements

---

## 📚 Documentation

- **User Guide**: `BULK_ATTACH_GUIDE.md`
- **Quick Start**: `QUICK_START.md`
- **Implementation Status**: `IMPLEMENTATION_STATUS.md`
- **This Guide**: `DEPLOYMENT_GUIDE.md`

---

## 🎉 Success Criteria

✅ All files deploy without errors  
✅ Database migration completes successfully  
✅ File upload endpoint responds correctly  
✅ Frontend page loads and functions  
✅ Auto-matching works (80%+ accuracy)  
✅ Files upload successfully  
✅ Data syncs automatically  
✅ Users can view attached files  
✅ No data loss or corruption  
✅ Performance meets expectations  

---

**Deployment Status**: Ready for production

**Last Updated**: May 5, 2026

**Version**: 1.0.0
