import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_PRIORITIES = ['regular', 'priority', 'vip'] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid user ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { priority } = body;

    // Validate priority field is provided
    if (!priority) {
      return NextResponse.json(
        { error: 'Priority is required', code: 'MISSING_PRIORITY' },
        { status: 400 }
      );
    }

    // Validate priority is a string
    if (typeof priority !== 'string') {
      return NextResponse.json(
        { error: 'Priority must be a string', code: 'INVALID_PRIORITY' },
        { status: 400 }
      );
    }

    // Validate priority value
    if (!VALID_PRIORITIES.includes(priority as typeof VALID_PRIORITIES[number])) {
      return NextResponse.json(
        { error: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`, code: 'INVALID_PRIORITY' },
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
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify user role is "client" or "account_owner"
    if (existingUser[0].role !== 'client' && existingUser[0].role !== 'account_owner') {
      return NextResponse.json(
        { error: 'Priority can only be set for client or account_owner users', code: 'NOT_CLIENT_OR_ACCOUNT_OWNER' },
        { status: 400 }
      );
    }

    // Update user with new priority
    const updatedUser = await db
      .update(users)
      .set({
        clientPriority: priority,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update user priority', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser[0];

    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}