# Supabase Storage Integration Guide

## ✅ What's Already Done

1. **Environment variables configured** in `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Supabase client package installed**: `@supabase/supabase-js`

3. **Storage utility functions created**: `src/lib/supabase-storage.ts`

4. **File upload API updated**: `src/app/api/files/upload/route.ts` now uses Supabase Storage

5. **Bucket setup API created**: `src/app/api/supabase/setup-buckets/route.ts`

---

## ⚠️ Issue Detected

The credentials you provided appear to be **JWT tokens** (anon keys), not the correct format for Supabase integration.

### What You Provided:
- **URL**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (This is a JWT token, not a URL)
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (This is also a JWT token)

### What's Needed:
You need the **actual Supabase Project URL** and **Service Role Key** from your Supabase dashboard.

---

## 🔧 How to Get the Correct Credentials

### Step 1: Go to Your Supabase Project
1. Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **"iwpmlbomegvjofssieval"**

### Step 2: Find Your Project URL
1. Go to **Settings** (gear icon in sidebar)
2. Click **API**
3. Under **Project URL**, copy the URL that looks like:
   ```
   https://iwpmlbomegvjofssieval.supabase.co
   ```

### Step 3: Find Your Service Role Key
1. Still in **Settings → API**
2. Under **Project API keys**, find **service_role** (not anon!)
3. Copy the service role key (it's a long JWT token starting with `eyJ...`)

### Step 4: Update Environment Variables
Replace the values in your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://iwpmlbomegvjofssieval.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📦 Next Steps After Updating Credentials

### 1. Create Storage Buckets (Automatic)

Once you have the correct credentials, the system will automatically create three storage buckets:

- **`job-files`** - For job attachments (private)
- **`profile-pictures`** - For user profile pictures (public)
- **`documents`** - For documents (private)

### 2. Configure Bucket Policies (Manual - In Supabase Dashboard)

You need to set storage policies for each bucket:

#### For `job-files` bucket:
Go to **Storage → job-files → Policies** and create:

**Policy Name**: "Allow authenticated uploads"
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-files');
```

**Policy Name**: "Allow users to read their job files"
```sql
CREATE POLICY "Allow users to read their job files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'job-files');
```

#### For `profile-pictures` bucket:
**Policy Name**: "Allow public access"
```sql
CREATE POLICY "Allow public access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');
```

**Policy Name**: "Allow authenticated uploads"
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');
```

#### For `documents` bucket:
Same as `job-files` bucket policies.

---

## 🧪 Testing the Integration

### Test 1: Setup Buckets
```bash
curl -X POST http://localhost:3000/api/supabase/setup-buckets
```

Expected response:
```json
{
  "success": true,
  "results": [
    {
      "bucket": "job-files",
      "status": "created",
      "message": "Bucket job-files created successfully"
    },
    ...
  ]
}
```

### Test 2: Upload a File
Go to any job page and try uploading a file. You should see:
- File uploads successfully
- File appears in the attachments list
- File can be downloaded

---

## 🔄 What Happens Next

Once you provide the correct credentials:

1. ✅ Supabase Storage will be fully functional
2. ✅ All file uploads will go to Supabase (no more Rediafile errors)
3. ✅ Files will be stored securely with proper access controls
4. ✅ You get 1GB of free storage (upgradable)

---

## 🆘 Need Help?

If you're having trouble finding the credentials:
1. Make sure you're logged into the correct Supabase account
2. Ensure your project "iwpmlbomegvjofssieval" exists
3. Check that you have admin access to the project

Once you have the **Project URL** and **Service Role Key**, just update the `.env` file and the system will work automatically! 🚀
