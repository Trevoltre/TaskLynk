import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, users, notifications, jobAttachments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, getWorkDeliveredEmailHTML } from '@/lib/email';

const VALID_STATUSES = [
  'pending',
  'approved',
  'assigned',
  'in_progress',
  'editing',
  'delivered',
  'revision',
  'revision_pending',
  'completed',
  'cancelled'
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
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
    const { status, revisionRequested, revisionNotes, clientApproved } = body;

    // Validate status field
    if (!status) {
      return NextResponse.json(
        {
          error: 'Status field is required',
          code: 'MISSING_STATUS'
        },
        { status: 400 }
      );
    }

    // Validate status is one of valid statuses
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
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
          code: 'JOB_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const job = existingJob[0];
    const oldStatus = job.status;

    // Build update object
    const updateData: {
      status: string;
      revisionRequested?: number;
      revisionNotes?: string | null;
      clientApproved?: number;
      updatedAt: string;
    } = {
      status,
      updatedAt: new Date().toISOString()
    };

    // Add optional fields if provided
    if (typeof revisionRequested === 'boolean') {
      updateData.revisionRequested = revisionRequested ? 1 : 0;
    }

    if (revisionNotes !== undefined) {
      updateData.revisionNotes = revisionNotes || null;
    }

    if (typeof clientApproved === 'boolean') {
      updateData.clientApproved = clientApproved ? 1 : 0;
    }

    // Update job
    const updatedJob = await db
      .update(jobs)
      .set(updateData)
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

    // SCHEDULE FILE DELETION: When order is completed, schedule all files for deletion after 1 week
    if (status === 'completed' && oldStatus !== 'completed') {
      try {
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        
        await db
          .update(jobAttachments)
          .set({
            scheduledDeletionAt: oneWeekFromNow.toISOString()
          })
          .where(eq(jobAttachments.jobId, jobId));

        console.log(`Scheduled file deletion for job ${jobId} at ${oneWeekFromNow.toISOString()}`);
      } catch (deletionError) {
        console.error('Failed to schedule file deletion:', deletionError);
        // Don't fail the status update if scheduling fails
      }
    }

    // NOTIFICATION SYSTEM: Notify all users about status change
    if (oldStatus !== status) {
      const usersToNotify: number[] = [];
      
      // Add client (always notified)
      usersToNotify.push(job.clientId);
      
      // Add assigned freelancer if exists
      if (job.assignedFreelancerId) {
        usersToNotify.push(job.assignedFreelancerId);
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

      // Create status change message
      let statusMessage = '';
      if (status === 'delivered') {
        statusMessage = 'Work has been delivered and is ready for review';
      } else if (status === 'completed') {
        statusMessage = 'Order has been completed successfully';
      } else if (status === 'revision') {
        statusMessage = 'Revision has been requested';
      } else if (status === 'cancelled') {
        statusMessage = 'Order has been cancelled';
      } else if (status === 'in_progress') {
        statusMessage = 'Work is now in progress';
      } else if (status === 'assigned') {
        statusMessage = 'Order has been assigned to a freelancer';
      } else {
        statusMessage = `Status changed from ${oldStatus} to ${status}`;
      }

      // Create notifications for all users
      for (const userId of usersToNotify) {
        try {
          await db.insert(notifications).values({
            userId,
            jobId: job.id,
            type: 'order_updated',
            title: `Order ${job.displayId} Status Updated`,
            message: `Order "${job.title}": ${statusMessage}`,
            read: false,
            createdAt: new Date().toISOString(),
          });
        } catch (notifError) {
          console.error(`Failed to create notification for user ${userId}:`, notifError);
        }
      }
    }

    // Send email notification when work is delivered
    if (status === 'delivered' && job.status !== 'delivered') {
      try {
        // Get client details
        const client = await db.select()
          .from(users)
          .where(eq(users.id, job.clientId))
          .limit(1);

        if (client.length > 0 && job.assignedFreelancerId) {
          // Get freelancer details
          const freelancer = await db.select()
            .from(users)
            .where(eq(users.id, job.assignedFreelancerId))
            .limit(1);

          if (freelancer.length > 0) {
            // UPDATED: Pass displayId to email function
            await sendEmail({
              to: client[0].email,
              subject: `Order ${job.displayId || `#${job.id}`} — Work Delivered`,
              html: getWorkDeliveredEmailHTML(
                client[0].name,
                job.title,
                job.id,
                job.displayId || `#${job.id}`,
                freelancer[0].name
              ),
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
    }

    return NextResponse.json(updatedJob[0], { 
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