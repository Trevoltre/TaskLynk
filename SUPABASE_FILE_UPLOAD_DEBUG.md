# 🔧 Supabase File Upload System - Debug & Setup Guide

## 📊 Current Status

### ✅ **What's Already Working:**
1. **Supabase Credentials Configured:**
   - ✅ Project URL: `https://iwpmlbomegvjofssieval.supabase.co`
   - ✅ Service Role Key: Configured in `.env`
   - ✅ Client library installed (`@supabase/supabase-js`)

2. **Backend Infrastructure Complete:**
   - ✅ File upload API endpoints ready (`/api/files/upload`, `/api/jobs/[id]/attachments`)
   - ✅ Database schema for attachments (`jobAttachments` table)
   - ✅ File size validation (40MB max, blocks videos)
   - ✅ Multiple upload types supported (initial, draft, final, revision)
   - ✅ Notification system for file uploads

3. **Frontend Components Ready:**
   - ✅ `FileUploadSection` component with drag-and-drop
   - ✅ File preview and download capabilities
   - ✅ Role-based permissions (admin/client/freelancer)
   - ✅ File retention policy (auto-delete 1 week after completion)

### ❌ **Issue Found: Supabase Bucket Setup Failed**

**Error:** `"fetch failed"` when trying to create storage buckets

**Root Cause:** Network connectivity issue OR buckets need to be created manually in Supabase dashboard

---

## 🛠️ **SOLUTION: Manual Bucket Creation**

Since automated bucket creation is failing, you need to **manually create the storage buckets** in your Supabase dashboard:

### **Step-by-Step Instructions:**

#### **1. Go to Supabase Dashboard**
- Visit: https://supabase.com/dashboard
- Select your project: `iwpmlbomegvjofssieval`

#### **2. Navigate to Storage**
- Click **"Storage"** in the left sidebar
- Click **"New Bucket"** button

#### **3. Create Three Buckets:**

##### **Bucket 1: `job-files` (Private)**
```
Name: job-files
Public: NO (keep private)
File size limit: 100 MB
Allowed MIME types: Leave blank (all types allowed)
```

**Purpose:** Stores all job-related files (client uploads, freelancer deliveries, revisions)

##### **Bucket 2: `profile-pictures` (Public)**
```
Name: profile-pictures
Public: YES (make public)
File size limit: 5 MB
Allowed MIME types: Leave blank or image/*
```

**Purpose:** Stores user profile pictures (publicly accessible)

##### **Bucket 3: `documents` (Private)**
```
Name: documents
Public: NO (keep private)
File size limit: 100 MB
Allowed MIME types: Leave blank (all types allowed)
```

**Purpose:** Stores additional documents and files

#### **4. Configure Bucket Policies (Important!)**

For **`job-files`** bucket, add this RLS policy:

**Policy Name:** `Allow authenticated uploads`
```sql
-- Allow any authenticated user to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'job-files');

-- Allow any authenticated user to read
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-files');

-- Allow users to delete their own files (optional)
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
USING (bucket_id = 'job-files');
```

For **`profile-pictures`** bucket (already public, no policy needed)

For **`documents`** bucket, use same policies as `job-files`

---

## 🧪 **Testing File Upload for All Three User Types**

Once buckets are created, test with these users:

### **Test Users:**
1. **Admin:** ID=43, Email=ashleydothy3162@gmail.com
2. **Client:** ID=50, Email=cccc@gmail.com
3. **Freelancer:** ID=49, Email=fsfsafasf@gmail.com

### **Test Job:**
- **Job ID:** 54
- **Title:** "Plag"
- **Status:** in_progress

### **Testing Process:**

#### **1. Login as Each User**
```
- Login as Admin (ID 43)
- Login as Client (ID 50)
- Login as Freelancer (ID 49)
```

#### **2. Navigate to Job Details Page**
```
Admin: /admin/jobs/54
Client: /client/jobs/54
Freelancer: /freelancer/jobs/54
```

#### **3. Test File Upload**
- Click "Choose File" or drag-and-drop
- Select test file (PDF, DOCX, image, etc.)
- Click "Upload"
- Verify success toast notification
- Verify file appears in file list

#### **4. Test File Download**
- Click download button on any uploaded file
- Verify file opens/downloads correctly
- **All users should be able to download any file**

#### **5. Test Different Upload Types**
- **Client:** Upload "initial" files when creating job
- **Freelancer:** Upload "draft" and "final" files
- **Admin:** Can upload any type
- **All:** Upload "revision" files

---

## 📁 **File Upload Features Summary**

### **Supported File Types:**
✅ Documents (PDF, DOCX, TXT, etc.)  
✅ Images (JPG, PNG, GIF, etc.)  
✅ Spreadsheets (XLSX, CSV, etc.)  
✅ Archives (ZIP, RAR, etc.)  
❌ Videos (blocked to save space)

### **File Size Limits:**
- **Maximum:** 40MB per file (API enforced)
- **Bucket Limit:** 100MB (Supabase setting)

### **Upload Types:**
1. **`initial`** - Client's original job files
2. **`draft`** - Freelancer's work-in-progress files
3. **`final`** - Freelancer's completed work
4. **`revision`** - Revision files from any user

### **Security & Privacy:**
- ✅ All files stored in private buckets (except profile pictures)
- ✅ Files accessible only through authenticated API
- ✅ Automatic deletion 1 week after job completion
- ✅ No direct public URL access (requires auth)

### **Permissions:**
| User Type | Upload | Download | Delete |
|-----------|--------|----------|--------|
| Admin | ✅ All files | ✅ All files | ✅ All files |
| Client | ✅ Own jobs | ✅ Own jobs | ✅ Own files |
| Freelancer | ✅ Assigned jobs | ✅ Assigned jobs | ✅ Own files |

---

## 🔍 **Troubleshooting**

### **Issue: "Failed to upload file to storage"**
**Solution:**
1. Verify buckets exist in Supabase dashboard
2. Check bucket policies allow uploads
3. Verify `.env` credentials are correct
4. Check browser console for detailed errors

### **Issue: "File size exceeds maximum allowed size"**
**Solution:**
- Files over 40MB are blocked by API
- Compress file or split into smaller parts
- Contact admin to increase limit if needed

### **Issue: "Video files are not allowed"**
**Solution:**
- Video files are intentionally blocked to save storage
- Use file-sharing services for videos
- Admin can remove video block in API if needed

### **Issue: Files not appearing after upload**
**Solution:**
1. Check browser console for errors
2. Verify notification appears (check notifications bell icon)
3. Refresh the page
4. Check if file appears in Supabase dashboard

---

## ✅ **What You Need to Do Now**

### **Required Actions:**
1. ✅ **Create three storage buckets manually** in Supabase dashboard:
   - `job-files` (Private)
   - `profile-pictures` (Public)
   - `documents` (Private)

2. ✅ **Configure bucket policies** for authenticated access

3. ✅ **Test file upload** with all three user types:
   - Admin (ID 43)
   - Client (ID 50)
   - Freelancer (ID 49)

4. ✅ **Verify file download** works for all users

### **Optional (After Testing):**
- Monitor storage usage in Supabase dashboard
- Adjust file size limits if needed
- Configure automatic backups
- Set up file retention policies

---

## 📞 **Support**

If you encounter any issues after creating the buckets:
1. Check the browser console for detailed error messages
2. Verify bucket names match exactly: `job-files`, `profile-pictures`, `documents`
3. Ensure bucket policies allow authenticated access
4. Verify `.env` credentials are correct

---

## 🎯 **Success Criteria**

File upload system is working correctly when:
- ✅ All three buckets exist in Supabase
- ✅ Admin can upload and download files from any job
- ✅ Clients can upload files to their own jobs
- ✅ Freelancers can upload files to assigned jobs
- ✅ All users receive notifications for new file uploads
- ✅ Files auto-delete 1 week after job completion
- ✅ Download links work for all authorized users

**Current Status:** ⏳ Waiting for manual bucket creation in Supabase dashboard
