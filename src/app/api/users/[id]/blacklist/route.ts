import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
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

    const userId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { reason } = body;

    // Validate reason is provided
    if (reason === undefined || reason === null) {
      return NextResponse.json(
        {
          error: 'Reason is required',
          code: 'MISSING_REASON',
        },
        { status: 400 }
      );
    }

    // Validate reason is non-empty string after trim
    if (typeof reason !== 'string' || reason.trim() === '') {
      return NextResponse.json(
        {
          error: 'Reason must be a non-empty string',
          code: 'EMPTY_REASON',
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Update user to blacklisted status
    const updatedUser = await db
      .update(users)
      .set({
        status: 'blacklisted',
        blacklistReason: reason.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning();

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser[0];

    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/users/[id]/blacklist error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}