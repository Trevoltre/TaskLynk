import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid message ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const messageId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { approved } = body;

    // Validate approved field
    if (approved === undefined || approved === null) {
      return NextResponse.json(
        { 
          error: 'Approved field is required',
          code: 'MISSING_APPROVED_FIELD' 
        },
        { status: 400 }
      );
    }

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { 
          error: 'Approved field must be a boolean',
          code: 'INVALID_APPROVED_TYPE' 
        },
        { status: 400 }
      );
    }

    // Check if message exists
    const existingMessage = await db.select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (existingMessage.length === 0) {
      return NextResponse.json(
        { 
          error: 'Message not found',
          code: 'MESSAGE_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Update message approval status
    const updatedMessage = await db.update(messages)
      .set({
        adminApproved: approved
      })
      .where(eq(messages.id, messageId))
      .returning();

    return NextResponse.json(updatedMessage[0], { status: 200 });

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