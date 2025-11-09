# Supabase Storage Setup Guide

## Quick Setup (Automated)

We've created an automated setup that will create all necessary storage buckets for you.

### Step 1: Run the Setup API

Visit this URL in your browser (while logged in as admin):
```
http://localhost:3000/api/supabase/setup-buckets
```

Or use curl:
```bash
curl http://localhost:3000/api/supabase/setup-buckets
```

This will automatically create all three required buckets:
- `job-files` (Public)
- `profile-pictures` (Public)
- `documents` (Public)

### Step 2: Verify Setup

After running the setup, you should see a success message. The system will:
✅ Create all storage buckets
✅ Set them to public access
✅ Configure CORS policies
✅ Set file size limits (40MB per file)

## Manual Setup (Alternative)

If you prefer to set up manually or if the automated setup fails:

### 1. Go to Supabase Dashboard
Visit: https://supabase.com/dashboard/project/iwpmlbomegvjofssieval

### 2. Navigate to Storage
Click on "Storage" in the left sidebar

### 3. Create Buckets
For each bucket, click "New bucket" and use these settings:

#### Bucket 1: job-files
- **Name**: `job-files`
- **Public bucket**: ✅ YES (Enable)
- **File size limit**: 40 MB
- **Allowed MIME types**: Leave empty (allow all)

#### Bucket 2: profile-pictures
- **Name**: `profile-pictures`
- **Public bucket**: ✅ YES (Enable)
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/png, image/jpeg, image/jpg, image/gif, image/webp`

#### Bucket 3: documents
- **Name**: `documents`
- **Public bucket**: ✅ YES (Enable)
- **File size limit**: 40 MB
- **Allowed MIME types**: Leave empty (allow all)

### 4. Configure Bucket Policies (if needed)

For each bucket, go to Policies and ensure:
- **SELECT**: Allow public access
- **INSERT**: Allow authenticated users
- **UPDATE**: Allow authenticated users
- **DELETE**: Allow authenticated users (optional, can restrict to admin only)

## Troubleshooting

### Issue: "Bucket already exists"
**Solution**: The bucket is already created! You can proceed to use the file upload system.

### Issue: "Access denied" or "Permission denied"
**Solution**: 
1. Check that the bucket is set to **Public**
2. Verify your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`
3. Ensure the storage policies allow public SELECT access

### Issue: "File too large"
**Solution**: 
- Files must be under 40MB
- For client initial uploads, files must be under 20MB
- Consider using Files.fm for larger files

### Issue: Upload works but download fails
**Solution**:
1. Ensure bucket is set to **Public**
2. Check the file URL format: `https://iwpmlbomegvjofssieval.supabase.co/storage/v1/object/public/bucket-name/file-path`
3. Verify CORS settings in Supabase dashboard

## Testing the Setup

After setup, test file upload by:

1. **As Client**: Go to "New Job" page and try uploading initial files
2. **As Freelancer**: Go to an assigned job and try uploading completed work
3. **As Admin**: Go to any job detail page and try uploading revision files

## Environment Variables

Ensure these are set in your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://iwpmlbomegvjofssieval.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3cG1sYm9tZWd2am9mc3NpZXZhbCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMwMjY4NjE2LCJleHAiOjIwNDU4NDQ2MTZ9.9-QZxH7yqkQ1SVh8LkflLvCuLIUh3G0X94s9c2xvj1c
```

## File Upload System Overview

### Who Can Upload What:

**Client:**
- Initial files when creating a job (uploadType: `initial`)
- Files.fm links anytime

**Freelancer:**
- Completed work files (uploadType: `work`)
- Draft files (uploadType: `draft`)
- Files.fm links anytime

**Admin:**
- Revision files (uploadType: `revision`)
- Files.fm links anytime

### File Size Limits:
- Client initial uploads: **20MB max**
- Freelancer work uploads: **40MB max**
- Admin revision uploads: **40MB max**
- Profile pictures: **5MB max**

### Supported File Types:
- Documents: PDF, DOC, DOCX, TXT, RTF
- Presentations: PPT, PPTX
- Spreadsheets: XLS, XLSX
- Images: PNG, JPG, JPEG, GIF, WEBP
- Archives: ZIP, RAR
- Other: Files.fm links (unlimited size)

## Files.fm Alternative

The platform also supports Files.fm link sharing as a backup:
- Upload files to https://files.fm
- Share the link through the platform
- No file size limits
- Works independently of Supabase storage

## Support

If you encounter issues:
1. Check this guide first
2. Review the troubleshooting section
3. Check browser console for specific error messages
4. Verify Supabase dashboard shows the buckets are created
5. Test with a small file (< 1MB) first

## Success Indicators

✅ You should see buckets listed in Supabase Storage dashboard
✅ Upload progress bar appears when selecting files
✅ Files appear in the job detail page after upload
✅ Download buttons work for all uploaded files
✅ File previews show correct information (name, size, type)
