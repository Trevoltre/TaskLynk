import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid job ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const jobId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { approved } = body;

    // Validate approved field is provided and is boolean
    if (approved === undefined || typeof approved !== 'boolean') {
      return NextResponse.json(
        { 
          error: 'Approved field is required and must be a boolean',
          code: 'INVALID_APPROVED_FIELD'
        },
        { status: 400 }
      );
    }

    // Check if job exists
    const existingJob = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
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

    const currentJob = existingJob[0];

    // Determine new status based on approval
    let newStatus = currentJob.status;
    if (approved) {
      // If approved is true and current status is pending, update to approved
      if (currentJob.status === 'pending') {
        newStatus = 'approved';
      }
    } else {
      // If approved is false, update status to cancelled
      newStatus = 'cancelled';
    }

    // Update job with new adminApproved status and status
    const updatedJob = await db.update(jobs)
      .set({
        adminApproved: approved,
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      .where(eq(jobs.id, jobId))
      .returning();

    return NextResponse.json(updatedJob[0], { status: 200 });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}