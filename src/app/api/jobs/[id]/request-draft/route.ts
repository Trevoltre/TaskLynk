import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // Validate jobId parameter
    if (!jobId || isNaN(parseInt(jobId))) {
      return NextResponse.json(
        {
          error: 'Valid job ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const parsedJobId = parseInt(jobId);

    // Check if job exists
    const existingJob = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, parsedJobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json(
        {
          error: 'Job not found',
          code: 'JOB_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Update job's requestDraft field to true
    const updatedJob = await db
      .update(jobs)
      .set({
        requestDraft: true,
        updatedAt: new Date().toISOString()
      })
      .where(eq(jobs.id, parsedJobId))
      .returning();

    return NextResponse.json(updatedJob[0], { status: 200 });
  } catch (error) {
    console.error('POST /api/jobs/[id]/request-draft error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message
      },
      { status: 500 }
    );
  }
}