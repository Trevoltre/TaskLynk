import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const VALID_NOTIFICATION_TYPES = [
  'account_approved',
  'account_rejected',
  'job_assigned',
  'job_completed',
  'payment_received',
  'message_received',
  'revision_requested',
  'order_delivered',
  'order_updated',
  'file_uploaded'
] as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const read = searchParams.get('read');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const whereConditions = [];

    // Validate and filter by userId
    if (userId) {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return NextResponse.json(
          { error: 'Invalid user ID', code: 'INVALID_USER_ID' },
          { status: 400 }
        );
      }
      whereConditions.push(eq(notifications.userId, userIdNum));
    }

    // Validate and filter by type
    if (type) {
      if (!VALID_NOTIFICATION_TYPES.includes(type as any)) {
        return NextResponse.json(
          { 
            error: `Invalid notification type. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`,
            code: 'INVALID_TYPE'
          },
          { status: 400 }
        );
      }
      whereConditions.push(eq(notifications.type, type));
    }

    // Validate and filter by read status
    if (read !== null && read !== undefined) {
      const readBoolean = read === 'true';
      whereConditions.push(eq(notifications.read, readBoolean));
    }

    // Build query
    let query = db.select().from(notifications);

    // Apply filters if any
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Apply ordering and pagination
    const results = await query
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, message } = body;

    // Validate userId
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { error: 'User ID must be a valid integer', code: 'INVALID_USER_ID' },
        { status: 400 }
      );
    }

    // Validate type
    if (!type) {
      return NextResponse.json(
        { error: 'Notification type is required', code: 'MISSING_TYPE' },
        { status: 400 }
      );
    }

    if (!VALID_NOTIFICATION_TYPES.includes(type)) {
      return NextResponse.json(
        { 
          error: `Invalid notification type. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`,
          code: 'INVALID_TYPE'
        },
        { status: 400 }
      );
    }

    // Validate title
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string', code: 'MISSING_TITLE' },
        { status: 400 }
      );
    }

    // Validate message
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string', code: 'MISSING_MESSAGE' },
        { status: 400 }
      );
    }

    // Prepare notification data - do not include id field
    const notificationData = {
      userId: userIdNum,
      type: type.trim(),
      title: title.trim(),
      message: message.trim(),
      read: false,
      createdAt: new Date().toISOString()
    };

    // Insert notification
    const newNotification = await db.insert(notifications)
      .values(notificationData)
      .returning();

    return NextResponse.json(newNotification[0], { status: 201 });
  } catch (error) {
    console.error('POST notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}