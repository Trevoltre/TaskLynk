import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { revisions, jobs, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    // Fetch revision with joins to jobs and users tables
    const result = await db
      .select({
        // Revision fields
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
        // Job fields
        jobData: {
          id: jobs.id,
          displayId: jobs.displayId,
          title: jobs.title,
          clientId: jobs.clientId,
          assignedFreelancerId: jobs.assignedFreelancerId,
        },
        // User/Submitter fields
        submitterData: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
      })
      .from(revisions)
      .innerJoin(jobs, eq(revisions.jobId, jobs.id))
      .innerJoin(users, eq(revisions.submittedBy, users.id))
      .where(eq(revisions.id, parseInt(id)))
      .limit(1);

    // Check if revision exists
    if (result.length === 0) {
      return NextResponse.json(
        { 
          error: 'Revision not found',
          code: 'REVISION_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Format response with nested job and submitter data
    const revision = result[0];
    const response = {
      id: revision.id,
      jobId: revision.jobId,
      submittedBy: revision.submittedBy,
      fileUrl: revision.fileUrl,
      fileName: revision.fileName,
      fileSize: revision.fileSize,
      fileType: revision.fileType,
      revisionNotes: revision.revisionNotes,
      status: revision.status,
      sentToFreelancer: revision.sentToFreelancer,
      approvedByAdmin: revision.approvedByAdmin,
      createdAt: revision.createdAt,
      updatedAt: revision.updatedAt,
      job: revision.jobData,
      submitter: revision.submitterData,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET revision error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error as Error).message,
        code: 'INTERNAL_SERVER_ERROR' 
      },
      { status: 500 }
    );
  }
}