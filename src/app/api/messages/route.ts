import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const senderId = searchParams.get('senderId');
    const receiverId = searchParams.get('receiverId');
    const jobId = searchParams.get('jobId');
    const adminApproved = searchParams.get('adminApproved');

    let query = db.select().from(messages);

    const conditions = [];

    if (senderId && !isNaN(parseInt(senderId))) {
      conditions.push(eq(messages.senderId, parseInt(senderId)));
    }

    if (receiverId && !isNaN(parseInt(receiverId))) {
      conditions.push(eq(messages.receiverId, parseInt(receiverId)));
    }

    if (jobId && !isNaN(parseInt(jobId))) {
      conditions.push(eq(messages.jobId, parseInt(jobId)));
    }

    if (adminApproved !== null) {
      if (adminApproved === 'true') {
        conditions.push(eq(messages.adminApproved, true));
      } else if (adminApproved === 'false') {
        conditions.push(eq(messages.adminApproved, false));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderId, receiverId, jobId, content, fileUrl } = body;

    if (!senderId || isNaN(parseInt(String(senderId)))) {
      return NextResponse.json(
        { error: 'Valid senderId is required', code: 'MISSING_SENDER_ID' },
        { status: 400 }
      );
    }

    if (!receiverId || isNaN(parseInt(String(receiverId)))) {
      return NextResponse.json(
        { error: 'Valid receiverId is required', code: 'MISSING_RECEIVER_ID' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json(
        { error: 'Content is required and must not be empty', code: 'MISSING_CONTENT' },
        { status: 400 }
      );
    }

    // Check if sender is admin - if so, auto-approve the message
    const sender = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(String(senderId))))
      .limit(1);

    const isAdminSender = sender.length > 0 && sender[0].role === 'admin';

    // Check if receiver is freelancer for admin messages
    const receiver = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(String(receiverId))))
      .limit(1);

    const isFreelancerReceiver = receiver.length > 0 && receiver[0].role === 'freelancer';

    const insertData: {
      senderId: number;
      receiverId: number;
      content: string;
      jobId?: number;
      fileUrl?: string;
      adminApproved: boolean;
      createdAt: string;
    } = {
      senderId: parseInt(String(senderId)),
      receiverId: parseInt(String(receiverId)),
      content: content.trim(),
      adminApproved: isAdminSender && isFreelancerReceiver, // Auto-approve if admin sending to freelancer
      createdAt: new Date().toISOString(),
    };

    if (jobId !== undefined && jobId !== null && !isNaN(parseInt(String(jobId)))) {
      insertData.jobId = parseInt(String(jobId));
    }

    if (fileUrl && typeof fileUrl === 'string' && fileUrl.trim() !== '') {
      insertData.fileUrl = fileUrl.trim();
    }

    const newMessage = await db.insert(messages).values(insertData).returning();

    return NextResponse.json(newMessage[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}