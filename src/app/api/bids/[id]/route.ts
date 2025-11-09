import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { bids } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const bidId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { message, status } = body;

    // Check if bid exists
    const existingBid = await db
      .select()
      .from(bids)
      .where(eq(bids.id, bidId))
      .limit(1);

    if (existingBid.length === 0) {
      return NextResponse.json(
        {
          error: 'Bid not found',
          code: 'BID_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (status !== undefined) {
      const validStatuses = ['pending', 'accepted', 'rejected'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: 'Invalid status. Must be one of: pending, accepted, rejected',
            code: 'INVALID_STATUS',
          },
          { status: 400 }
        );
      }
    }

    // Validate message if provided
    if (message !== undefined) {
      const trimmedMessage = message.trim();
      if (trimmedMessage === '') {
        return NextResponse.json(
          {
            error: 'Message cannot be empty',
            code: 'EMPTY_MESSAGE',
          },
          { status: 400 }
        );
      }
    }

    // Build update object with provided fields
    const updates: {
      message?: string;
      status?: string;
    } = {};

    if (message !== undefined) {
      updates.message = message.trim();
    }

    if (status !== undefined) {
      updates.status = status;
    }

    // Check if there are any updates to perform
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: 'No valid fields provided for update',
          code: 'NO_UPDATES',
        },
        { status: 400 }
      );
    }

    // Update bid with provided fields
    const updatedBid = await db
      .update(bids)
      .set(updates)
      .where(eq(bids.id, bidId))
      .returning();

    return NextResponse.json(updatedBid[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}