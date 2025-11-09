import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { revisions, jobs, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate jobId
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid job ID is required',
          code: 'INVALID_JOB_ID',
        },
        { status: 400 }
      );
    }

    const jobIdInt = parseInt(id);

    // Verify job exists
    const job = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobIdInt))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json(
        {
          error: 'Job not found',
          code: 'JOB_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { submittedBy, fileUrl, fileName, fileSize, fileType, revisionNotes } = body;

    // Validate required fields
    if (!submittedBy) {
      return NextResponse.json(
        {
          error: 'submittedBy is required',
          code: 'MISSING_SUBMITTED_BY',
        },
        { status: 400 }
      );
    }

    if (typeof submittedBy !== 'number' || !Number.isInteger(submittedBy) || submittedBy <= 0) {
      return NextResponse.json(
        {
          error: 'submittedBy must be a valid positive integer',
          code: 'INVALID_SUBMITTED_BY',
        },
        { status: 400 }
      );
    }

    if (!fileUrl || typeof fileUrl !== 'string' || fileUrl.trim() === '') {
      return NextResponse.json(
        {
          error: 'fileUrl is required and must be a non-empty string',
          code: 'MISSING_FILE_URL',
        },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(fileUrl);
    } catch {
      return NextResponse.json(
        {
          error: 'fileUrl must be a valid URL',
          code: 'INVALID_FILE_URL',
        },
        { status: 400 }
      );
    }

    if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
      return NextResponse.json(
        {
          error: 'fileName is required and must be a non-empty string',
          code: 'MISSING_FILE_NAME',
        },
        { status: 400 }
      );
    }

    if (!fileSize || typeof fileSize !== 'number' || !Number.isInteger(fileSize) || fileSize <= 0) {
      return NextResponse.json(
        {
          error: 'fileSize is required and must be a positive integer',
          code: 'INVALID_FILE_SIZE',
        },
        { status: 400 }
      );
    }

    if (!fileType || typeof fileType !== 'string' || fileType.trim() === '') {
      return NextResponse.json(
        {
          error: 'fileType is required and must be a non-empty string',
          code: 'MISSING_FILE_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate optional revisionNotes if provided
    if (revisionNotes !== undefined && typeof revisionNotes !== 'string') {
      return NextResponse.json(
        {
          error: 'revisionNotes must be a string',
          code: 'INVALID_REVISION_NOTES',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Create revision - do NOT include id field
    const insertData: any = {
      jobId: jobIdInt,
      submittedBy,
      fileUrl: fileUrl.trim(),
      fileName: fileName.trim(),
      fileSize,
      fileType: fileType.trim(),
      status: 'pending_review',
      sentToFreelancer: 0,
      approvedByAdmin: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (revisionNotes !== undefined && revisionNotes !== null) {
      insertData.revisionNotes = revisionNotes.trim() || null;
    }

    const newRevision = await db
      .insert(revisions)
      .values(insertData)
      .returning();

    return NextResponse.json(newRevision[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
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
    const { id } = params;
    const { searchParams } = new URL(request.url);

    // Validate jobId
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid job ID is required',
          code: 'INVALID_JOB_ID',
        },
        { status: 400 }
      );
    }

    const jobIdInt = parseInt(id);

    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Verify job exists
    const job = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobIdInt))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json(
        {
          error: 'Job not found',
          code: 'JOB_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Get revisions with user details
    const results = await db
      .select({
        id: revisions.id,
        jobId: revisions.jobId,
        submittedBy: revisions.submittedBy,
        fileUrl: revisions.fileUrl,
        fileName: revisions.fileName,
        fileSize: revisions.fileSize,
        fileType: revisions.fileType,
        revisionNotes: revisions.revisionNotes,
        status: revisions.status,
        sentToFreelancer: revisions.sentToFreelancer,
        approvedByAdmin: revisions.approvedByAdmin,
        createdAt: revisions.createdAt,
        updatedAt: revisions.updatedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
      })
      .from(revisions)
      .leftJoin(users, eq(revisions.submittedBy, users.id))
      .where(eq(revisions.jobId, jobIdInt))
      .orderBy(desc(revisions.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}