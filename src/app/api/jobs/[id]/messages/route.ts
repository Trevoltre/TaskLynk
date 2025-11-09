import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobMessages, jobs, users } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // Validate jobId parameter
    if (!jobId || isNaN(parseInt(jobId))) {
      return NextResponse.json(
        { error: 'Valid job ID is required', code: 'INVALID_JOB_ID' },
        { status: 400 }
      );
    }

    const parsedJobId = parseInt(jobId);

    // Parse request body
    const body = await request.json();
    const { senderId, message, messageType, autoApprove } = body;

    // Validate required fields
    if (!senderId) {
      return NextResponse.json(
        { error: 'Sender ID is required', code: 'MISSING_SENDER_ID' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required and cannot be empty', code: 'MISSING_MESSAGE' },
        { status: 400 }
      );
    }

    // Validate messageType if provided
    const validMessageTypes = ['text', 'link'];
    const finalMessageType = messageType || 'text';
    
    if (!validMessageTypes.includes(finalMessageType)) {
      return NextResponse.json(
        { error: `Invalid messageType. Must be one of: ${validMessageTypes.join(', ')}`, code: 'INVALID_MESSAGE_TYPE' },
        { status: 400 }
      );
    }

    // Validate job exists
    const existingJob = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, parsedJobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if sender is admin
    const sender = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(senderId)))
      .limit(1);

    const isAdmin = sender.length > 0 && sender[0].role === 'admin';
    
    // Auto-approve if sender is admin OR if autoApprove flag is set
    const shouldAutoApprove = isAdmin || autoApprove === true;

    // Insert message with auto-approval for admin messages
    const newMessage = await db
      .insert(jobMessages)
      .values({
        jobId: parsedJobId,
        senderId: parseInt(senderId),
        message: message.trim(),
        messageType: finalMessageType,
        adminApproved: shouldAutoApprove,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newMessage[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/jobs/[id]/messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    // Validate jobId parameter
    if (!jobId || isNaN(parseInt(jobId))) {
      return NextResponse.json(
        { error: 'Valid job ID is required', code: 'INVALID_JOB_ID' },
        { status: 400 }
      );
    }

    const parsedJobId = parseInt(jobId);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '50'),
      100
    );
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const userRole = searchParams.get('userRole'); // 'admin', 'client', 'freelancer'

    // Build query with user details - always join to get sender information
    const allMessages = await db
      .select({
        id: jobMessages.id,
        jobId: jobMessages.jobId,
        senderId: jobMessages.senderId,
        message: jobMessages.message,
        messageType: jobMessages.messageType,
        adminApproved: jobMessages.adminApproved,
        createdAt: jobMessages.createdAt,
        senderName: users.name,
        senderEmail: users.email,
        senderRole: users.role,
      })
      .from(jobMessages)
      .leftJoin(users, eq(jobMessages.senderId, users.id))
      .where(eq(jobMessages.jobId, parsedJobId))
      .orderBy(asc(jobMessages.createdAt))
      .limit(limit)
      .offset(offset);

    // Filter messages based on user role
    let filteredMessages = allMessages;
    
    // Only show approved messages for non-admin users
    if (userRole !== 'admin') {
      filteredMessages = allMessages.filter(msg => msg.adminApproved === true);
    }

    // Format response with nested sender object
    const formattedMessages = filteredMessages.map(msg => ({
      id: msg.id,
      jobId: msg.jobId,
      senderId: msg.senderId,
      message: msg.message,
      messageType: msg.messageType || 'text',
      adminApproved: msg.adminApproved,
      createdAt: msg.createdAt,
      sender: {
        id: msg.senderId,
        name: msg.senderName || 'Unknown User',
        email: msg.senderEmail || '',
        role: msg.senderRole || 'unknown',
      },
    }));

    return NextResponse.json(formattedMessages, { status: 200 });
  } catch (error) {
    console.error('GET /api/jobs/[id]/messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}