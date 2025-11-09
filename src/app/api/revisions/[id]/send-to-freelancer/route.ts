import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { revisions, jobs, notifications } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid revision ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const revisionId = parseInt(id);

    // Check if revision exists
    const revision = await db.select()
      .from(revisions)
      .where(eq(revisions.id, revisionId))
      .limit(1);

    if (revision.length === 0) {
      return NextResponse.json(
        { 
          error: 'Revision not found',
          code: 'REVISION_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const currentRevision = revision[0];

    // Get associated job details to find assignedFreelancerId
    const job = await db.select()
      .from(jobs)
      .where(eq(jobs.id, currentRevision.jobId))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json(
        { 
          error: 'Associated job not found',
          code: 'JOB_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const currentJob = job[0];

    // Verify job has assigned freelancer
    if (!currentJob.assignedFreelancerId) {
      return NextResponse.json(
        { 
          error: 'Job has no assigned freelancer',
          code: 'NO_ASSIGNED_FREELANCER' 
        },
        { status: 400 }
      );
    }

    const currentTimestamp = new Date().toISOString();

    // **CRITICAL: Change job status to 'revision' when sending to freelancer**
    await db.update(jobs)
      .set({
        status: 'revision',
        updatedAt: currentTimestamp
      })
      .where(eq(jobs.id, currentRevision.jobId));

    // Update revision
    const updatedRevision = await db.update(revisions)
      .set({
        sentToFreelancer: true,
        status: 'sent_to_freelancer',
        updatedAt: currentTimestamp
      })
      .where(eq(revisions.id, revisionId))
      .returning();

    // Create notification for freelancer
    await db.insert(notifications)
      .values({
        userId: currentJob.assignedFreelancerId,
        jobId: currentRevision.jobId,
        type: 'revision_requested',
        title: 'Revision Required',
        message: `A revision has been sent to you for order #${currentJob.displayId}`,
        read: false,
        createdAt: currentTimestamp
      });

    return NextResponse.json(
      {
        message: 'Revision successfully sent to freelancer. Job status changed to revision.',
        revision: updatedRevision[0]
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}