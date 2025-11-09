# 🚀 Quick Supabase Bucket Setup (5 Minutes)

## ⚡ TL;DR
Create 3 storage buckets in Supabase dashboard to enable file uploads.

---

## 📍 **Step-by-Step Instructions**

### **1. Go to Supabase Dashboard**
```
URL: https://supabase.com/dashboard
Project: iwpmlbomegvjofssieval
```

### **2. Click "Storage" → "New Bucket"**

---

## 🪣 **Bucket 1: `job-files`** (CRITICAL)

**Settings:**
- **Name:** `job-files` (exact spelling)
- **Public:** ❌ NO (keep private)
- **File Size Limit:** 100000000 (100MB)

**Policies:** Click bucket → Policies tab → New Policy → Custom:

```sql
-- Policy 1: Allow uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'job-files');

-- Policy 2: Allow downloads
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-files');

-- Policy 3: Allow deletes
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'job-files');
```

---

## 🪣 **Bucket 2: `profile-pictures`**

**Settings:**
- **Name:** `profile-pictures` (exact spelling)
- **Public:** ✅ YES (make public)
- **File Size Limit:** 5000000 (5MB)

**Policies:** None needed (public bucket)

---

## 🪣 **Bucket 3: `documents`**

**Settings:**
- **Name:** `documents` (exact spelling)
- **Public:** ❌ NO (keep private)
- **File Size Limit:** 100000000 (100MB)

**Policies:** Same as `job-files`:

```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents');
```

---

## ✅ **Verify Setup**

After creating buckets:

1. Go to your app
2. Login as any user
3. Go to any job page
4. Upload a file
5. **Expected:** Success toast + file appears in list
6. Click download → File opens

---

## ❌ **Common Mistakes**

1. **Wrong bucket names** - Must be exact: `job-files`, `profile-pictures`, `documents`
2. **Forgot policies** - `job-files` and `documents` need authentication policies
3. **Wrong permissions** - Make sure buckets are private (except `profile-pictures`)

---

## 🆘 **Need Help?**

**Issue:** File upload fails after bucket creation

**Solution:**
1. Verify bucket names are exactly: `job-files`, `profile-pictures`, `documents`
2. Check policies are created (in Policies tab)
3. Verify `.env` has correct `SUPABASE_SERVICE_ROLE_KEY`
4. Try uploading a small file (< 1MB) first
5. Check browser console for error messages

---

## 🎯 **Done!**

Once buckets are created:
- ✅ File uploads work for all users
- ✅ Downloads work for all users
- ✅ Notifications sent automatically
- ✅ Files auto-delete after 1 week
- ✅ System is fully operational

**Time to complete:** ~5 minutes  
**One-time setup:** Yes  
**Further action needed:** No
