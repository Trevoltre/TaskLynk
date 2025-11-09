import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { revisions, jobs, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

const VALID_STATUSES = ['pending_review', 'approved', 'sent_to_freelancer', 'completed'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Validate status parameter if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { 
          error: `Invalid status parameter. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // Build query with joins - filter by status if provided
    let query = db
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
        job: {
          id: jobs.id,
          displayId: jobs.displayId,
          title: jobs.title,
          clientId: jobs.clientId,
        },
        submitter: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
      })
      .from(revisions)
      .leftJoin(jobs, eq(revisions.jobId, jobs.id))
      .leftJoin(users, eq(revisions.submittedBy, users.id));

    // Apply status filter if provided
    if (status) {
      query = query.where(eq(revisions.status, status));
    }

    // Apply ordering and pagination
    const results = await query
      .orderBy(desc(revisions.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}