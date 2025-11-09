import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Validate userId is provided
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    // Validate userId is a valid integer
    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return NextResponse.json(
        { 
          error: 'User ID must be a valid integer',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }

    // Query users table for the freelancer
    const freelancer = await db.select()
      .from(users)
      .where(
        and(
          eq(users.id, parsedUserId),
          eq(users.role, 'freelancer')
        )
      )
      .limit(1);

    // Check if freelancer exists
    if (freelancer.length === 0) {
      return NextResponse.json(
        { 
          error: 'Freelancer not found',
          code: 'FREELANCER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const user = freelancer[0];

    // Return balance and earnings information
    return NextResponse.json({
      userId: user.id,
      balance: user.balance,
      earned: user.earned,
      totalEarnings: user.totalEarnings,
      name: user.name,
      email: user.email
    }, { status: 200 });

  } catch (error) {
    console.error('GET /api/freelancer/balance error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}