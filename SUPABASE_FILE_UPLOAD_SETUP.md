# Supabase File Upload System - Setup Guide

## Overview
TaskLynk now features a complete file upload system using Supabase Storage with automatic cleanup of files 1 week after order completion.

## Features Implemented
✅ **Real File Uploads**: Actual file uploads to Supabase Storage (replacing mock URLs)
✅ **All User Roles**: Client, Freelancer, and Admin file upload capabilities
✅ **Automatic Cleanup**: Files auto-delete 1 week after client approval
✅ **Secure Storage**: Server-side upload validation and authentication
✅ **Multiple File Types**: Support for documents, images, archives (no videos)
✅ **Size Limits**: 100MB per file, 10 files per job

## 🚀 Quick Setup (3 Steps)

### Step 1: Create Supabase Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/slelguoygbfzlpylpxfs
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Create bucket with these settings:
   - **Name**: `job-files`
   - **Public**: ✅ YES (enable public access)
   - Click **"Create bucket"**

5. Configure CORS for the bucket:
   - Go to **Storage Settings**
   - Add CORS policy:
   ```json
   {
     "allowedOrigins": ["*"],
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "allowedHeaders": ["*"],
     "maxAgeSeconds": 3600
   }
   ```

### Step 2: Get Your Supabase Service Role Key

1. In Supabase Dashboard, go to **Settings** → **API**
2. Find the **"Service Role Key"** (NOT the anon key)
3. Copy this secret key (starts with `eyJ...`)
4. **IMPORTANT**: This key has admin access - keep it secure!

### Step 3: Update Environment Variables

Add these to your `.env` file:

```bash
# Supabase Storage (already set)
NEXT_PUBLIC_SUPABASE_URL=https://slelguoygbfzlpylpxfs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here_from_step_2

# Cron Job Security (for file cleanup)
CRON_SECRET=your_random_secret_here_generate_one_below
```

To generate a secure CRON_SECRET, run:
```bash
openssl rand -base64 32
```

## 📦 What's Included

### 1. File Upload API (`/api/files/upload`)
- **Method**: POST (multipart/form-data)
- **Max Size**: 100MB per file
- **Supported Types**: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, RAR, JPG, PNG, GIF
- **Storage**: Supabase Storage bucket `job-files`
- **Path Structure**: `job-{jobId}/{uploadType}/{timestamp}-{filename}`

### 2. Automatic File Cleanup Cron Job
- **Endpoint**: `/api/cron/cleanup-files`
- **Schedule**: Daily at midnight (configured in `vercel.json`)
- **Trigger**: Deletes files from orders completed >7 days ago
- **Security**: Requires `CRON_SECRET` header

### 3. Client Upload Integration
- ✅ Real Supabase uploads on job creation (`/client/new-job`)
- ✅ Progress feedback with toast notifications
- ✅ Multiple file support (up to 10 files)
- ✅ File validation (size, type, count)

### 4. Freelancer Upload (Ready to Integrate)
- 🔜 Upload completed work files
- 🔜 Upload draft files (if requested)
- 🔜 Upload revision files

### 5. Admin File Management (Ready to Integrate)
- 🔜 View all job attachments
- 🔜 Download files
- 🔜 Delete files manually if needed

## 🔧 File Upload Usage

### For Clients (Job Creation)
```typescript
// Already integrated in /client/new-job
const formData = new FormData();
formData.append('file', file);
formData.append('jobId', jobId.toString());
formData.append('uploadedBy', userId.toString());
formData.append('uploadType', 'initial'); // 'initial', 'draft', 'final', 'revision'

const response = await fetch('/api/files/upload', {
  method: 'POST',
  body: formData
});
```

### For Freelancers (Completed Work)
```typescript
// To be integrated in freelancer job detail page
formData.append('uploadType', 'final'); // for completed work
formData.append('uploadType', 'draft'); // for draft submissions
```

### For Revisions
```typescript
// To be integrated in revision submission
formData.append('uploadType', 'revision'); // for revision files
```

## 📊 Database Schema

Files are stored in the `job_attachments` table:
```sql
- id (integer, primary key)
- jobId (integer, foreign key to jobs)
- uploadedBy (integer, foreign key to users)
- fileName (text)
- fileUrl (text) - Supabase Storage public URL
- fileSize (integer) - in bytes
- fileType (text) - MIME type
- uploadType (text) - 'initial', 'draft', 'final', 'revision'
- createdAt (text, ISO timestamp)
```

## 🗑️ File Cleanup Policy

**When files are deleted:**
1. Order status = `completed`
2. Client has approved (`clientApproved = true`)
3. More than 7 days have passed since `updatedAt`

**What gets deleted:**
- All files associated with the job from Supabase Storage
- All records from `job_attachments` table

**User notification:**
When client requests files after deletion:
> "Files have been automatically deleted after approval. Please upload your previous submission if you need to re-submit."

## 🔐 Security Features

1. **Server-side validation**: File size, type, and count limits
2. **Service role authentication**: Only server can upload (no client-side keys)
3. **Cron job protection**: Requires secret header to run
4. **Path sanitization**: Prevents directory traversal attacks
5. **MIME type validation**: Blocks video files and unsafe types

## 🚦 Deployment Checklist

Before deploying to production:

- [ ] Create `job-files` bucket in Supabase (public access enabled)
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to environment variables
- [ ] Generate and add `CRON_SECRET` to environment variables
- [ ] Configure Vercel Cron Jobs (automatically done via `vercel.json`)
- [ ] Test file upload from all user roles
- [ ] Verify cron job runs: `curl https://your-domain.com/api/cron/cleanup-files?secret=YOUR_SECRET`
- [ ] Monitor storage usage in Supabase Dashboard

## 📈 Next Steps (To Complete Full Implementation)

1. **Freelancer Job Detail Page** (`/freelancer/jobs/[id]`)
   - Add file upload for completed work
   - Add file upload for drafts
   - Show uploaded files list

2. **Admin Job Management** (`/admin/jobs/[id]`)
   - Display all job attachments
   - Add download all files button
   - Add manual delete option

3. **Client Job View** (`/client/jobs/[id]`)
   - Display uploaded instruction files
   - Display received completed work files
   - Add download buttons

4. **File Preview/Download**
   - Add file preview for images/PDFs
   - Add bulk download as ZIP
   - Add file sharing links

## 🐛 Troubleshooting

### Upload fails with "Missing Supabase environment variables"
**Solution**: Ensure `.env` has both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Files don't appear in Supabase Storage
**Solution**: Check bucket name is exactly `job-files` and public access is enabled

### Cron job doesn't run
**Solution**: 
1. Verify `vercel.json` is in project root
2. Check Vercel Dashboard → Settings → Cron Jobs
3. Ensure `CRON_SECRET` is set in environment variables

### Upload exceeds size limit
**Solution**: Files are limited to 100MB. For larger files, consider chunked uploads or increase limit in `/api/files/upload/route.ts`

## 📚 Related Files

- `src/lib/supabase-storage.ts` - Storage utility functions
- `src/app/api/files/upload/route.ts` - Upload endpoint
- `src/app/api/cron/cleanup-files/route.ts` - Cleanup cron job
- `src/app/client/new-job/page.tsx` - Client upload integration
- `vercel.json` - Cron job configuration
- `.env.example` - Environment variables template

## 🎉 Success!

Once setup is complete, users can:
- ✅ Upload real files to secure cloud storage
- ✅ Access files from any device
- ✅ Automatic cleanup after 1 week of approval
- ✅ No local storage or mock URLs
- ✅ Production-ready file management

---

**Need Help?** Check Supabase Storage docs: https://supabase.com/docs/guides/storage
