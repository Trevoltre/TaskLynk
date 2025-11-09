# 📦 Supabase File Storage - Complete Setup Guide

## 🚀 Quick Start (3 Easy Steps)

### Step 1: Run Automated Setup
As an **admin user**, navigate to:
```
http://localhost:3000/admin/storage-setup
```

Or click **"Storage Setup"** in the admin left navigation menu.

### Step 2: Click "Set Up Storage Buckets"
The automated setup will:
- ✅ Create `job-files` bucket (40MB limit, public)
- ✅ Create `profile-pictures` bucket (5MB limit, public)
- ✅ Create `documents` bucket (40MB limit, public)

### Step 3: Verify Success
You should see green checkmarks ✅ for all three buckets. Done! 🎉

---

## 📋 What This Solves

### Before Setup:
- ❌ File uploads fail with "fetch failed" errors
- ❌ No storage buckets exist in Supabase
- ❌ Users can only share Files.fm links

### After Setup:
- ✅ Direct file uploads work for all users
- ✅ Files stored securely in Supabase storage
- ✅ Automatic file management and cleanup
- ✅ Both direct uploads AND Files.fm links supported

---

## 🗂️ Storage Buckets Explained

### 1. **job-files** (40MB limit)
**Purpose:** Main storage for job-related files

**Who uploads:**
- **Clients:** Initial job files (requirements, reference materials)
- **Freelancers:** Completed work files (papers, presentations, etc.)
- **Admin:** Revision files

**File types:** PDF, DOC, DOCX, TXT, PPT, PPTX, XLS, XLSX, ZIP, images

### 2. **profile-pictures** (5MB limit)
**Purpose:** User profile photos

**Who uploads:**
- All users (client, freelancer, admin)

**File types:** PNG, JPG, JPEG, GIF, WEBP

### 3. **documents** (40MB limit)
**Purpose:** Administrative documents

**Who uploads:**
- **Admin:** Invoices, receipts, contracts
- **System:** Auto-generated documents

**File types:** PDF, DOC, DOCX, TXT, XLS, XLSX

---

## 🔧 Manual Setup (If Automated Fails)

### Option 1: Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/iwpmlbomegvjofssieval/storage/buckets

2. Click **"New bucket"** for each:

   **Bucket: job-files**
   - Name: `job-files`
   - Public: ✅ **YES**
   - File size limit: `40 MB`
   - Allowed MIME types: *(leave empty)*

   **Bucket: profile-pictures**
   - Name: `profile-pictures`
   - Public: ✅ **YES**
   - File size limit: `5 MB`
   - Allowed MIME types: `image/png, image/jpeg, image/jpg, image/gif, image/webp`

   **Bucket: documents**
   - Name: `documents`
   - Public: ✅ **YES**
   - File size limit: `40 MB`
   - Allowed MIME types: *(leave empty)*

3. Save each bucket

### Option 2: Via API Call

```bash
curl -X POST http://localhost:3000/api/supabase/setup-buckets
```

Or visit in browser:
```
http://localhost:3000/api/supabase/setup-buckets
```

---

## 📤 How File Uploads Work

### Client Upload Flow:
1. Client creates new job
2. Uploads initial files (requirements, samples)
3. Files stored in `job-files` bucket with `uploadType: initial`
4. Admin reviews and approves job

### Freelancer Upload Flow:
1. Freelancer assigned to job
2. Completes work and uploads files
3. Files stored in `job-files` bucket with `uploadType: work`
4. Admin reviews and delivers to client

### Admin Upload Flow:
1. Client requests revision
2. Admin uploads revised files
3. Files stored in `job-files` bucket with `uploadType: revision`
4. Freelancer sees revision and updates work

---

## 🔒 Security & Access Control

### Public Buckets = Public URLs
All buckets are **public** which means:
- ✅ Files can be downloaded via direct URL
- ✅ No authentication needed for downloads
- ✅ Simplifies file sharing across users

### But Upload Requires Authentication:
- ❌ Anonymous users **cannot** upload
- ✅ Only logged-in users can upload
- ✅ Upload permissions checked via API

### File Access Rules:
- **Initial files:** Everyone can download (job requirements)
- **Work files:** Only after payment confirmed (protects freelancer work)
- **Revision files:** Admin can download anytime
- **Profile pictures:** Public (for display in UI)
- **Documents:** Admin only

---

## 📊 File Size Limits

| User Type | Upload Type | Max Size | Notes |
|-----------|-------------|----------|-------|
| Client | Initial files | 20 MB | Per file, job creation |
| Freelancer | Work files | 40 MB | Per file, completed work |
| Admin | Revision files | 40 MB | Per file, any time |
| All Users | Profile picture | 5 MB | Single file |
| Admin | Documents | 40 MB | Invoices, receipts |

**For files over 40MB:** Use Files.fm link sharing (unlimited size)

---

## 🔍 Testing the Setup

### Test 1: Client Upload
1. Log in as client
2. Go to "New Job" page
3. Fill form and upload a small PDF (< 1MB)
4. Submit job
5. ✅ File should appear in job details

### Test 2: Freelancer Upload
1. Log in as freelancer
2. Go to assigned job
3. Upload completed work file
4. ✅ File should appear with upload progress

### Test 3: Admin Upload
1. Log in as admin
2. Go to any job detail page
3. Click "Submit Revision"
4. Upload revision file
5. ✅ File should save successfully

---

## 🐛 Troubleshooting

### Problem: "Bucket already exists" error
**Solution:** ✅ This is **good**! It means buckets are already set up. You're ready to go!

### Problem: Upload fails with "Permission denied"
**Solutions:**
1. Verify buckets are set to **Public** in Supabase dashboard
2. Check environment variables in `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://iwpmlbomegvjofssieval.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```
3. Ensure you're logged in
4. Try refreshing the page

### Problem: "File too large" error
**Solutions:**
1. Check file size:
   - Client: Max 20MB
   - Freelancer: Max 40MB
   - Admin: Max 40MB
2. Use Files.fm for larger files
3. Compress/optimize the file

### Problem: Upload succeeds but download fails
**Solutions:**
1. Verify bucket is **Public** in Supabase
2. Check file URL format: 
   ```
   https://iwpmlbomegvjofssieval.supabase.co/storage/v1/object/public/bucket-name/path
   ```
3. Open URL in browser to test direct access
4. Check browser console for CORS errors

### Problem: Can't see uploaded files
**Solutions:**
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Check network tab for API call errors
3. Verify file was uploaded in Supabase dashboard
4. Check database `attachments` table for file record

---

## 🌐 Files.fm Alternative

The platform **also** supports Files.fm link sharing:

### Why Use Files.fm?
- ✅ No file size limits
- ✅ Works if Supabase storage fails
- ✅ External hosting (doesn't count against Supabase quota)
- ✅ Simple link sharing

### How to Use:
1. Visit https://files.fm
2. Upload your file
3. Copy the share link
4. Paste in platform's link sharing section
5. Submit (admin approves before delivery)

### When to Use Which:
- **Use Supabase:** Small-medium files (< 40MB), want automatic management
- **Use Files.fm:** Large files (> 40MB), temporary sharing, external hosting preference

---

## 📈 Storage Monitoring

### View Storage Usage:
1. Go to Supabase dashboard
2. Navigate to **Storage** → **Usage**
3. See:
   - Total storage used
   - Files per bucket
   - Bandwidth usage

### Storage Limits (Free Tier):
- **Storage:** 1 GB
- **Bandwidth:** 2 GB/month
- **File uploads:** Unlimited count

### What Happens When Full?
1. Uploads will fail with "quota exceeded"
2. Upgrade to paid plan, or
3. Use Files.fm for new files
4. Clean up old files via cleanup API

---

## 🧹 File Cleanup

### Automatic Cleanup:
The platform automatically removes:
- Files from cancelled jobs (after 7 days)
- Orphaned files (no linked job)
- Temporary uploads (expired)

### Manual Cleanup:
Run the cleanup cron job:
```bash
curl http://localhost:3000/api/cron/cleanup-files
```

Or set up automatic cron (in production):
```
0 2 * * * curl https://yourdomain.com/api/cron/cleanup-files
```

---

## ✅ Success Checklist

After setup, verify:
- [ ] All 3 buckets created in Supabase
- [ ] All buckets set to **Public**
- [ ] File size limits configured (40MB, 5MB)
- [ ] Client can upload initial files
- [ ] Freelancer can upload work files
- [ ] Admin can upload revision files
- [ ] Downloads work for all file types
- [ ] Files.fm link sharing works
- [ ] File upload progress shows correctly
- [ ] Uploaded files appear in job details

---

## 🎯 Key Features Summary

✅ **Direct file uploads** for all users  
✅ **Automatic file management** and storage  
✅ **40MB file size support** for most uploads  
✅ **Public bucket access** for easy downloads  
✅ **Files.fm integration** for larger files  
✅ **Automatic cleanup** of old files  
✅ **Progress indicators** during upload  
✅ **File type validation** and size checks  
✅ **Role-based upload permissions**  
✅ **Payment-protected downloads** for completed work  

---

## 📞 Support

If you encounter issues not covered here:
1. Check browser console for specific errors
2. Verify Supabase dashboard shows buckets
3. Test with a small file (< 1MB) first
4. Ensure environment variables are correct
5. Try Files.fm as backup option

---

## 🎉 You're All Set!

Once you see green checkmarks in the Storage Setup page, your file storage is ready to use across the entire platform. Users can now upload files directly, and the system will handle everything automatically! 🚀
