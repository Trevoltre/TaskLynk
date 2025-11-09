import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobAttachments, jobs, users, notifications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { uploadFile, STORAGE_BUCKETS } from '@/lib/backblaze-storage';

// Allowed file formats (server-side validation)
const ALLOWED_FORMATS = [
  'pdf', 'doc', 'docx', 'ppt', 'pptx',
  'xls', 'xlsx', 'txt', 'rtf',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
  'zip', 'rar', '7z', 'tar', 'gz',
  'mp3', 'mp4', 'wav', 'avi', 'mov',
  'csv', 'json', 'xml'
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const jobId = formData.get('jobId') as string;
    const uploadedBy = formData.get('uploadedBy') as string;
    const uploadType = formData.get('uploadType') as string; // 'initial', 'draft', 'final', 'revision'
    const file = formData.get('file') as File;

    // Validate inputs
    if (!jobId || isNaN(parseInt(jobId))) {
      return NextResponse.json(
        { error: 'Valid job ID is required', code: 'INVALID_JOB_ID' },
        { status: 400 }
      );
    }

    if (!uploadedBy || isNaN(parseInt(uploadedBy))) {
      return NextResponse.json(
        { error: 'Valid uploader user ID is required', code: 'INVALID_UPLOADED_BY' },
        { status: 400 }
      );
    }

    if (!uploadType || !['initial', 'draft', 'final', 'revision'].includes(uploadType)) {
      return NextResponse.json(
        { error: 'Valid upload type is required (initial, draft, final, revision)', code: 'INVALID_UPLOAD_TYPE' },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'File is required', code: 'MISSING_FILE' },
        { status: 400 }
      );
    }

    // ✅ VALIDATE FILE FORMAT (Backend validation)
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt) {
      return NextResponse.json(
        { error: 'File must have an extension', code: 'NO_FILE_EXTENSION' },
        { status: 400 }
      );
    }
    
    if (!ALLOWED_FORMATS.includes(fileExt)) {
      return NextResponse.json(
        { error: `Unsupported file type: .${fileExt}. Please upload a supported file format.`, code: 'INVALID_FILE_FORMAT' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must not exceed 100MB', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    let url = '';
    
    // Upload to Supabase Storage
    try {
      // ✅ PRESERVE ORIGINAL FILENAME - Create unique file path with timestamp and original filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `job-${jobId}/${uploadType}/${timestamp}-${sanitizedFileName}`;
      
      const result = await uploadFile(
        STORAGE_BUCKETS.JOB_FILES,
        filePath,
        file,
        file.type
      );
      
      if (result.error) {
        throw result.error;
      }
      
      url = result.url || '';
    } catch (error) {
      console.error('Backblaze B2 upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file to storage', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // ✅ Store file metadata in database with ORIGINAL FILENAME preserved
    const newAttachment = await db.insert(jobAttachments)
      .values({
        jobId: parseInt(jobId),
        uploadedBy: parseInt(uploadedBy),
        fileName: file.name, // ✅ PRESERVE ORIGINAL FILENAME with extension
        fileUrl: url,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream', // ✅ PRESERVE MIME TYPE
        uploadType: uploadType,
        createdAt: new Date().toISOString(),
      })
      .returning();

    // NOTIFICATION SYSTEM: Notify all users associated with this order about new file
    try {
      const job = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, parseInt(jobId)))
        .limit(1);

      if (job.length > 0) {
        const usersToNotify: number[] = [];
        
        // Add client (always notified)
        usersToNotify.push(job[0].clientId);
        
        // Add assigned freelancer if exists
        if (job[0].assignedFreelancerId) {
          usersToNotify.push(job[0].assignedFreelancerId);
        }
        
        // Add all admins
        const admins = await db
          .select()
          .from(users)
          .where(eq(users.role, 'admin'))
          .all();
        
        admins.forEach(admin => {
          if (!usersToNotify.includes(admin.id)) {
            usersToNotify.push(admin.id);
          }
        });

        // Don't notify the uploader
        const filteredUsers = usersToNotify.filter(id => id !== parseInt(uploadedBy));

        // Determine file type message
        let fileTypeMessage = 'A new file';
        if (uploadType === 'initial') {
          fileTypeMessage = 'A new order file';
        } else if (uploadType === 'draft') {
          fileTypeMessage = 'A draft file';
        } else if (uploadType === 'final') {
          fileTypeMessage = 'A completed file';
        } else if (uploadType === 'revision') {
          fileTypeMessage = 'A revision file';
        }

        // Create notifications for all users
        for (const userId of filteredUsers) {
          try {
            await db.insert(notifications).values({
              userId,
              jobId: job[0].id,
              type: 'file_uploaded',
              title: `New File Added to Order ${job[0].displayId}`,
              message: `${fileTypeMessage} "${file.name}" has been uploaded to order "${job[0].title}"`,
              read: false,
              createdAt: new Date().toISOString(),
            });
          } catch (notifError) {
            console.error(`Failed to create notification for user ${userId}:`, notifError);
          }
        }
      }
    } catch (notificationError) {
      console.error('Failed to create file upload notifications:', notificationError);
      // Don't fail the upload if notifications fail
    }

    return NextResponse.json({
      success: true,
      attachment: newAttachment[0],
      message: `File "${file.name}" uploaded successfully with format preserved`
    }, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}