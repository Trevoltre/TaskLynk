import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobMessages, jobs, users, notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const { id, messageId } = params;

    // Validate job ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid job ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    // Validate message ID
    if (!messageId || isNaN(parseInt(messageId))) {
      return NextResponse.json(
        { 
          error: 'Valid message ID is required',
          code: 'INVALID_MESSAGE_ID' 
        },
        { status: 400 }
      );
    }

    const jobIdInt = parseInt(id);
    const messageIdInt = parseInt(messageId);

    // Check if message exists and belongs to the specified job
    const existingMessage = await db.select()
      .from(jobMessages)
      .where(
        and(
          eq(jobMessages.id, messageIdInt),
          eq(jobMessages.jobId, jobIdInt)
        )
      )
      .limit(1);

    if (existingMessage.length === 0) {
      return NextResponse.json(
        { 
          error: 'Message not found or does not belong to this job',
          code: 'MESSAGE_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const message = existingMessage[0];

    // Get job details
    const job = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobIdInt))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json(
        { 
          error: 'Job not found',
          code: 'JOB_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Get sender details
    const sender = await db.select()
      .from(users)
      .where(eq(users.id, message.senderId))
      .limit(1);

    if (sender.length === 0) {
      return NextResponse.json(
        { 
          error: 'Sender not found',
          code: 'SENDER_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const jobData = job[0];
    const senderData = sender[0];

    // Update the message to mark as admin approved
    const updatedMessage = await db.update(jobMessages)
      .set({
        adminApproved: true
      })
      .where(
        and(
          eq(jobMessages.id, messageIdInt),
          eq(jobMessages.jobId, jobIdInt)
        )
      )
      .returning();

    if (updatedMessage.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to update message',
          code: 'UPDATE_FAILED' 
        },
        { status: 500 }
      );
    }

    // Create notifications for relevant users
    const notificationData = {
      type: 'message_received',
      title: 'New Message on Order',
      jobId: jobIdInt,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Notify client if sender is freelancer
    if (senderData.role === 'freelancer' && jobData.clientId) {
      try {
        await db.insert(notifications).values({
          ...notificationData,
          userId: jobData.clientId,
          message: `You have a new message from ${senderData.name} on order ${jobData.displayId}`,
        });
      } catch (error) {
        console.error('Failed to create client notification:', error);
      }
    }

    // Notify freelancer if sender is client
    if (senderData.role === 'client' && jobData.assignedFreelancerId) {
      try {
        await db.insert(notifications).values({
          ...notificationData,
          userId: jobData.assignedFreelancerId,
          message: `You have a new message from ${senderData.name} on order ${jobData.displayId}`,
        });
      } catch (error) {
        console.error('Failed to create freelancer notification:', error);
      }
    }

    return NextResponse.json(updatedMessage[0], { status: 200 });

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