import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID is a valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid job ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const jobId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { placementPriority } = body;

    // Validate placementPriority is provided and is an integer
    if (placementPriority === undefined || placementPriority === null) {
      return NextResponse.json(
        {
          error: 'placementPriority is required',
          code: 'MISSING_PLACEMENT_PRIORITY',
        },
        { status: 400 }
      );
    }

    if (typeof placementPriority !== 'number' || !Number.isInteger(placementPriority)) {
      return NextResponse.json(
        {
          error: 'placementPriority must be an integer',
          code: 'INVALID_PLACEMENT_PRIORITY',
        },
        { status: 400 }
      );
    }

    // Check if job exists
    const existingJob = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json(
        {
          error: 'Job not found',
          code: 'JOB_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const job = existingJob[0];

    // Calculate urgencyMultiplier based on deadline
    const deadline = new Date(job.deadline);
    const now = new Date();
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    const urgencyMultiplier = hoursUntilDeadline < 8 ? 1.3 : 1.0;

    // Calculate calculatedPrice
    const calculatedPrice = job.amount * urgencyMultiplier;

    // Update job with new values
    const updatedJob = await db
      .update(jobs)
      .set({
        placementPriority,
        urgencyMultiplier,
        calculatedPrice,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    if (updatedJob.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to update job',
          code: 'UPDATE_FAILED',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedJob[0], { status: 200 });
  } catch (error) {
    console.error('PATCH /api/jobs/[id]/placement error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}