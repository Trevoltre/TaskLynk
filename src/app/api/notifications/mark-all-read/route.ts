import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Validate userId parameter
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'userId parameter is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return NextResponse.json(
        { 
          error: 'userId must be a valid integer',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }

    // Update all unread notifications for the user
    const updated = await db
      .update(notifications)
      .set({ 
        read: true
      })
      .where(
        and(
          eq(notifications.userId, parsedUserId),
          eq(notifications.read, false)
        )
      )
      .returning();

    return NextResponse.json(
      {
        message: 'All notifications marked as read',
        updatedCount: updated.length
      },
      { status: 200 }
    );

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