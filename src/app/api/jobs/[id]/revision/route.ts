import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { sendEmail, getRevisionRequestedEmailHTML } from '@/lib/email';
import { calculateFreelancerAmount } from '@/lib/payment-calculations';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
    const { revisionNotes, requestedBy, revisionHours } = body;

    // Validate revisionNotes is provided and not empty
    if (!revisionNotes || typeof revisionNotes !== 'string' || revisionNotes.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Revision notes are required',
          code: 'MISSING_REVISION_NOTES'
        },
        { status: 400 }
      );
    }

    // Validate and process revisionHours
    let hoursForRevision = 24; // Default to 24 hours
    
    if (revisionHours !== undefined && revisionHours !== null) {
      // Convert to number
      const parsedHours = typeof revisionHours === 'number' ? revisionHours : parseFloat(revisionHours);
      
      // Validate it's a valid number
      if (isNaN(parsedHours)) {
        return NextResponse.json(
          { 
            error: 'Revision hours must be a valid number',
            code: 'INVALID_REVISION_TIME'
          },
          { status: 400 }
        );
      }
      
      // Validate minimum 2 hours
      if (parsedHours < 2) {
        return NextResponse.json(
          { 
            error: 'Revision hours must be at least 2 hours',
            code: 'INVALID_REVISION_TIME'
          },
          { status: 400 }
        );
      }
      
      // Validate maximum 240 hours (10 days)
      if (parsedHours > 240) {
        return NextResponse.json(
          { 
            error: 'Revision hours cannot exceed 240 hours (10 days)',
            code: 'INVALID_REVISION_TIME'
          },
          { status: 400 }
        );
      }
      
      hoursForRevision = parsedHours;
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

    const job = existingJob[0];
    const now = new Date();
    const currentTimestamp = now.toISOString();

    // **CRITICAL: If job was completed and paid, subtract the amount from freelancer balance**
    let balanceSubtracted = false;
    let amountSubtracted = 0;

    if (job.status === 'completed' && job.paymentConfirmed && job.assignedFreelancerId) {
      const freelancerAmount = calculateFreelancerAmount(job.amount);
      
      // Get current freelancer
      const freelancerResult = await db.select()
        .from(users)
        .where(eq(users.id, job.assignedFreelancerId))
        .limit(1);

      if (freelancerResult.length > 0) {
        const freelancer = freelancerResult[0];
        
        // Subtract the amount from balance
        const newBalance = Math.max(0, freelancer.balance - freelancerAmount);
        
        await db.update(users)
          .set({
            balance: newBalance,
            updatedAt: currentTimestamp
          })
          .where(eq(users.id, job.assignedFreelancerId));

        balanceSubtracted = true;
        amountSubtracted = freelancerAmount;
      }
    }

    // Calculate new deadlines based on revision hours
    const newActualDeadline = new Date(now.getTime() + hoursForRevision * 60 * 60 * 1000);
    const newFreelancerDeadline = new Date(now.getTime() + (hoursForRevision * 0.6) * 60 * 60 * 1000);

    // Update job with revision request - goes to admin for approval first
    const updatedJob = await db.update(jobs)
      .set({
        revisionRequested: true,
        revisionNotes: revisionNotes.trim(),
        status: 'revision_pending', // Client requests go to admin first
        actualDeadline: newActualDeadline.toISOString(),
        freelancerDeadline: newFreelancerDeadline.toISOString(),
        updatedAt: currentTimestamp
      })
      .where(eq(jobs.id, jobId))
      .returning();

    // Send email notification to admin about revision request
    if (requestedBy === 'client') {
      try {
        // Get all admins
        const admins = await db.select()
          .from(users)
          .where(eq(users.role, 'admin'));

        // Get client details
        const client = await db.select()
          .from(users)
          .where(eq(users.id, job.clientId))
          .limit(1);

        if (admins.length > 0 && client.length > 0) {
          // Send email to all admins
          for (const admin of admins) {
            await sendEmail({
              to: admin.email,
              subject: '🔄 Revision Request Needs Approval - TaskLynk',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1D3557;">Revision Request Needs Your Approval</h2>
                  <p>Hello ${admin.name},</p>
                  <p>Client <strong>${client[0].name}</strong> has requested a revision for job <strong>#${job.id} - ${job.title}</strong>.</p>
                  ${balanceSubtracted ? `<div style="background-color: #fff3cd; padding: 10px; border-radius: 6px; margin: 15px 0;"><strong>⚠️ Balance Adjustment:</strong> KES ${amountSubtracted.toFixed(2)} has been automatically deducted from freelancer's balance.</div>` : ''}
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1D3557;">Revision Notes:</h3>
                    <p style="white-space: pre-wrap;">${revisionNotes.trim()}</p>
                    <p style="margin-top: 15px;"><strong>Revision Time:</strong> ${hoursForRevision} hours</p>
                    <p><strong>New Deadline:</strong> ${newActualDeadline.toLocaleString()}</p>
                    <p><strong>Freelancer Deadline:</strong> ${newFreelancerDeadline.toLocaleString()}</p>
                  </div>
                  <p>Please review and approve or reject this revision request in the admin panel.</p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/jobs/${job.id}" style="display: inline-block; background-color: #1D3557; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Job Details</a>
                </div>
              `,
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
    }

    return NextResponse.json({
      ...updatedJob[0],
      balanceSubtracted,
      amountSubtracted: balanceSubtracted ? amountSubtracted : 0
    }, { status: 200 });

  } catch (error) {
    console.error('POST revision error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}