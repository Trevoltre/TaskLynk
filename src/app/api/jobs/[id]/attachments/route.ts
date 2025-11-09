import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobAttachments, jobs, users } from '@/db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';

const MAX_FILE_SIZE = 41943040; // 40MB in bytes
const BLOCKED_VIDEO_TYPES = [
  'video/mp4',
  'video/avi',
  'video/x-msvideo',
  'video/quicktime',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/webm'
];
const VALID_UPLOAD_TYPES = ['initial', 'draft', 'final', 'revision'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // Validate jobId parameter
    if (!jobId || isNaN(parseInt(jobId))) {
      return NextResponse.json(
        { error: 'Valid job ID is required', code: 'INVALID_JOB_ID' },
        { status: 400 }
      );
    }

    const parsedJobId = parseInt(jobId);

    // Validate job exists
    const job = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, parsedJobId))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { uploadedBy, fileName, fileUrl, fileSize, fileType, uploadType } = body;

    // Validate required fields
    if (!uploadedBy) {
      return NextResponse.json(
        { error: 'uploadedBy is required', code: 'MISSING_UPLOADED_BY' },
        { status: 400 }
      );
    }

    if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
      return NextResponse.json(
        { error: 'fileName is required and must be a non-empty string', code: 'INVALID_FILE_NAME' },
        { status: 400 }
      );
    }

    if (!fileUrl || typeof fileUrl !== 'string' || fileUrl.trim() === '') {
      return NextResponse.json(
        { error: 'fileUrl is required and must be a non-empty string', code: 'INVALID_FILE_URL' },
        { status: 400 }
      );
    }

    // Allow fileSize of 0 for external links
    if (typeof fileSize !== 'number' || fileSize < 0) {
      return NextResponse.json(
        { error: 'fileSize is required and must be a non-negative number', code: 'INVALID_FILE_SIZE' },
        { status: 400 }
      );
    }

    if (!fileType || typeof fileType !== 'string' || fileType.trim() === '') {
      return NextResponse.json(
        { error: 'fileType is required and must be a non-empty string', code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      );
    }

    if (!uploadType || typeof uploadType !== 'string') {
      return NextResponse.json(
        { error: 'uploadType is required', code: 'MISSING_UPLOAD_TYPE' },
        { status: 400 }
      );
    }

    // Validate uploadedBy is a valid integer
    if (isNaN(parseInt(uploadedBy.toString()))) {
      return NextResponse.json(
        { error: 'uploadedBy must be a valid integer', code: 'INVALID_UPLOADED_BY' },
        { status: 400 }
      );
    }

    // Validate file size does not exceed 40MB (skip for external links)
    if (fileType !== 'external/link' && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: `File size exceeds maximum allowed size of 40MB (${MAX_FILE_SIZE} bytes)`, 
          code: 'FILE_SIZE_EXCEEDED' 
        },
        { status: 400 }
      );
    }

    // Validate file type is not a blocked video type (skip for external links)
    if (fileType !== 'external/link' && BLOCKED_VIDEO_TYPES.includes(fileType.toLowerCase())) {
      return NextResponse.json(
        { 
          error: 'Video files are not allowed', 
          code: 'VIDEO_FILE_NOT_ALLOWED' 
        },
        { status: 400 }
      );
    }

    // Validate uploadType is one of the valid types
    if (!VALID_UPLOAD_TYPES.includes(uploadType)) {
      return NextResponse.json(
        { 
          error: `uploadType must be one of: ${VALID_UPLOAD_TYPES.join(', ')}`, 
          code: 'INVALID_UPLOAD_TYPE' 
        },
        { status: 400 }
      );
    }

    // Insert attachment
    const newAttachment = await db
      .insert(jobAttachments)
      .values({
        jobId: parsedJobId,
        uploadedBy: parseInt(uploadedBy.toString()),
        fileName: fileName.trim(),
        fileUrl: fileUrl.trim(),
        fileSize,
        fileType: fileType.trim(),
        uploadType,
        scheduledDeletionAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newAttachment[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/jobs/[id]/attachments error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    const { searchParams } = new URL(request.url);

    // Validate jobId parameter
    if (!jobId || isNaN(parseInt(jobId))) {
      return NextResponse.json(
        { error: 'Valid job ID is required', code: 'INVALID_JOB_ID' },
        { status: 400 }
      );
    }

    const parsedJobId = parseInt(jobId);

    // Parse pagination parameters
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '50'),
      100
    );
    const offset = parseInt(searchParams.get('offset') ?? '0');

    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json(
        { error: 'limit must be a positive number', code: 'INVALID_LIMIT' },
        { status: 400 }
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: 'offset must be a non-negative number', code: 'INVALID_OFFSET' },
        { status: 400 }
      );
    }

    // Parse optional filter parameters
    const uploadType = searchParams.get('uploadType');
    const uploadedBy = searchParams.get('uploadedBy');

    // Validate uploadType if provided
    if (uploadType && !VALID_UPLOAD_TYPES.includes(uploadType)) {
      return NextResponse.json(
        { 
          error: `uploadType must be one of: ${VALID_UPLOAD_TYPES.join(', ')}`, 
          code: 'INVALID_UPLOAD_TYPE' 
        },
        { status: 400 }
      );
    }

    // Validate uploadedBy if provided
    if (uploadedBy && isNaN(parseInt(uploadedBy))) {
      return NextResponse.json(
        { error: 'uploadedBy must be a valid integer', code: 'INVALID_UPLOADED_BY' },
        { status: 400 }
      );
    }

    // Build query with filters and user details - EXCLUDE DELETED FILES
    const conditions = [
      eq(jobAttachments.jobId, parsedJobId),
      isNull(jobAttachments.deletedAt) // Only show files that haven't been deleted
    ];

    if (uploadType) {
      conditions.push(eq(jobAttachments.uploadType, uploadType));
    }

    if (uploadedBy) {
      conditions.push(eq(jobAttachments.uploadedBy, parseInt(uploadedBy)));
    }

    // Query with uploader details
    const attachments = await db
      .select({
        id: jobAttachments.id,
        jobId: jobAttachments.jobId,
        uploadedBy: jobAttachments.uploadedBy,
        fileName: jobAttachments.fileName,
        fileUrl: jobAttachments.fileUrl,
        fileSize: jobAttachments.fileSize,
        fileType: jobAttachments.fileType,
        uploadType: jobAttachments.uploadType,
        scheduledDeletionAt: jobAttachments.scheduledDeletionAt,
        deletedAt: jobAttachments.deletedAt,
        createdAt: jobAttachments.createdAt,
        uploader: {
          id: users.id,
          name: users.name,
          role: users.role,
          email: users.email,
        },
      })
      .from(jobAttachments)
      .leftJoin(users, eq(jobAttachments.uploadedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(jobAttachments.createdAt))
      .limit(limit)
      .offset(offset);

    // Format response to include uploaderRole and uploaderName
    const formattedAttachments = attachments.map(att => ({
      id: att.id,
      jobId: att.jobId,
      uploadedBy: att.uploadedBy,
      uploaderName: att.uploader?.name || 'Unknown User',
      uploaderRole: att.uploader?.role || 'unknown',
      uploaderEmail: att.uploader?.email || '',
      fileName: att.fileName,
      fileUrl: att.fileUrl,
      fileSize: att.fileSize,
      fileType: att.fileType,
      uploadType: att.uploadType,
      scheduledDeletionAt: att.scheduledDeletionAt,
      deletedAt: att.deletedAt,
      createdAt: att.createdAt,
    }));

    return NextResponse.json(formattedAttachments, { status: 200 });
  } catch (error) {
    console.error('GET /api/jobs/[id]/attachments error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}