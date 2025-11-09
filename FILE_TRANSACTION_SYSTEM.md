# File Transaction System Documentation

## Overview

TaskLynk now implements automatic file deletion 1 week after order completion. This ensures data privacy and reduces storage costs while maintaining file accessibility during the order lifecycle.

## How It Works

### 1. File Upload
- Users (clients, freelancers, admins) upload files to orders through the platform
- Files are stored in Supabase Storage (if configured) or as metadata
- Each file has metadata tracked in the `job_attachments` table

### 2. Order Completion
- When an order status changes to `completed`, the system automatically schedules all associated files for deletion
- **Deletion Schedule**: 7 days (1 week) from order completion
- The `scheduledDeletionAt` timestamp is set for all files in the order

### 3. Automatic File Cleanup
- A cleanup API endpoint (`/api/files/cleanup-expired`) checks for expired files
- Files past their scheduled deletion date are:
  1. Deleted from Supabase Storage (if configured)
  2. Marked as deleted in the database (`deletedAt` timestamp set)
  3. File URL replaced with `[DELETED]` to prevent access attempts

### 4. File Visibility
- Only files that haven't been deleted (`deletedAt` is null) are shown to users
- Deleted files remain in the database for audit purposes but are inaccessible

## Database Schema

### job_attachments Table

```typescript
{
  id: integer (primary key),
  jobId: integer (foreign key to jobs),
  uploadedBy: integer (foreign key to users),
  fileName: text,
  fileUrl: text,
  fileSize: integer,
  fileType: text,
  uploadType: text, // 'initial', 'draft', 'final', 'revision'
  scheduledDeletionAt: text, // ISO timestamp - NEW FIELD
  deletedAt: text, // ISO timestamp - NEW FIELD
  createdAt: text
}
```

## API Endpoints

### 1. File Cleanup Endpoint

#### DELETE /api/files/cleanup-expired
Automatically deletes files past their scheduled deletion date.

**Security**: Protected by optional `x-api-key` header

**Request**:
```bash
curl -X DELETE https://your-domain.com/api/files/cleanup-expired \
  -H "x-api-key: your-cron-api-key"
```

**Response**:
```json
{
  "success": true,
  "message": "Cleanup completed. Deleted 15 files.",
  "deletedCount": 15,
  "errorCount": 0,
  "totalProcessed": 15
}
```

#### GET /api/files/cleanup-expired
Returns information about files scheduled for deletion.

**Response**:
```json
{
  "expiredFilesCount": 5,
  "expiredFiles": [...],
  "upcomingDeletionsCount": 12,
  "upcomingDeletions": [...],
  "currentTime": "2025-11-07T12:00:00.000Z"
}
```

### 2. Attachments Endpoint (Updated)

#### GET /api/jobs/{id}/attachments
Now automatically filters out deleted files.

Only returns files where `deletedAt` is null.

## Automated Cleanup Schedule

### Option 1: Vercel Cron Jobs (Recommended)

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/files/cleanup-expired",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs the cleanup daily at 2 AM UTC.

### Option 2: External Cron Service

Use services like:
- **Cron-job.org**
- **EasyCron**
- **GitHub Actions**

Configure to call:
```
DELETE https://your-domain.com/api/files/cleanup-expired
```

Set environment variable:
```
CRON_API_KEY=your-secure-random-key
```

### Option 3: Manual Trigger

Admin can manually trigger cleanup:
```bash
curl -X DELETE https://your-domain.com/api/files/cleanup-expired
```

## Timeline Example

1. **Day 0**: Order created, client uploads files
2. **Day 3**: Freelancer uploads completed work
3. **Day 5**: Client approves and pays
4. **Day 5**: Order marked as `completed`
   - **Automatic**: All files scheduled for deletion on Day 12
5. **Day 12**: Cleanup runs
   - **Automatic**: All files deleted from storage
   - Files marked as deleted in database
   - URLs replaced with `[DELETED]`

## User Experience

### Before Deletion (Days 0-12)
- ✅ Users can view all uploaded files
- ✅ Users can download files (based on permissions)
- ✅ Files accessible via file URLs

### After Deletion (Day 12+)
- ❌ Files no longer appear in file lists
- ❌ File URLs return `[DELETED]`
- ❌ Download attempts fail gracefully
- ℹ️ Database retains metadata for audit

## Benefits

1. **Privacy**: Client and freelancer files automatically removed after completion
2. **Storage Savings**: Reduces cloud storage costs
3. **Compliance**: Helps meet data retention policies
4. **Automated**: No manual intervention required
5. **Audit Trail**: Deleted file records maintained in database

## Migration Required

Run database migration to add new fields:

```bash
npm run db:push
# or
npx drizzle-kit push
```

This adds:
- `scheduledDeletionAt` field to `job_attachments`
- `deletedAt` field to `job_attachments`

## Environment Variables

```env
# Optional: For securing cron endpoint
CRON_API_KEY=your-secure-random-key

# Supabase (if using cloud storage)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Monitoring

### Check Scheduled Deletions
```bash
curl https://your-domain.com/api/files/cleanup-expired
```

### Manual Cleanup
```bash
curl -X DELETE https://your-domain.com/api/files/cleanup-expired
```

## Testing

1. Complete an order
2. Check `job_attachments` table - `scheduledDeletionAt` should be set to 7 days ahead
3. Wait 7 days OR manually update `scheduledDeletionAt` to past date
4. Run cleanup endpoint
5. Verify files are deleted from storage and marked in database

## Notes

- Files remain accessible for the entire 7-day period after completion
- Clients have enough time to download completed work
- System gracefully handles Supabase storage not being configured
- Cleanup endpoint is idempotent - safe to run multiple times
- Failed deletions are logged but don't stop the cleanup process

## Future Enhancements

- [ ] Configurable deletion period (admin setting)
- [ ] Email notifications before deletion
- [ ] File archive/export before deletion
- [ ] Per-order custom retention periods
- [ ] Restore deleted files within grace period
