import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, users, bids } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { sendEmail, getJobAssignedEmailHTML } from '@/lib/email';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID parameter
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
    const { freelancerId } = body;

    // Validate freelancerId is provided
    if (freelancerId === undefined || freelancerId === null) {
      return NextResponse.json(
        {
          error: 'Freelancer ID is required',
          code: 'MISSING_FREELANCER_ID'
        },
        { status: 400 }
      );
    }

    // Validate freelancerId is a valid integer
    if (typeof freelancerId !== 'number' || isNaN(freelancerId) || !Number.isInteger(freelancerId)) {
      return NextResponse.json(
        {
          error: 'Valid freelancer ID is required',
          code: 'INVALID_FREELANCER_ID'
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

    // Get freelancer details
    const freelancer = await db.select()
      .from(users)
      .where(eq(users.id, freelancerId))
      .limit(1);

    if (freelancer.length === 0) {
      return NextResponse.json(
        {
          error: 'Freelancer not found',
          code: 'FREELANCER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // CRITICAL: Accept the bid from the assigned freelancer
    await db.update(bids)
      .set({ status: 'accepted' })
      .where(and(
        eq(bids.jobId, jobId),
        eq(bids.freelancerId, freelancerId)
      ));

    // CRITICAL: Reject all other bids for this job
    await db.update(bids)
      .set({ status: 'rejected' })
      .where(and(
        eq(bids.jobId, jobId),
        ne(bids.freelancerId, freelancerId)
      ));

    // Update job with assigned freelancer, status to in_progress, and timestamp
    const updatedJob = await db.update(jobs)
      .set({
        assignedFreelancerId: freelancerId,
        status: 'in_progress',
        updatedAt: new Date().toISOString()
      })
      .where(eq(jobs.id, jobId))
      .returning();

    if (updatedJob.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to update job',
          code: 'UPDATE_FAILED'
        },
        { status: 500 }
      );
    }

    // Send email notification to freelancer
    const job = updatedJob[0];
    try {
      await sendEmail({
        to: freelancer[0].email,
        subject: '🎉 New Job Assigned to You on TaskLynk!',
        html: getJobAssignedEmailHTML(
          freelancer[0].name,
          job.title,
          job.id,
          new Date(job.deadline).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          job.amount
        ),
      });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    return NextResponse.json(job, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

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