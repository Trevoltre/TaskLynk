import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_BADGES = ['bronze', 'silver', 'gold', 'platinum', 'elite'] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: "Valid user ID is required",
          code: "INVALID_ID" 
        },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { badge } = body;

    // Validate badge is provided
    if (!badge) {
      return NextResponse.json(
        { 
          error: "Badge is required",
          code: "MISSING_BADGE" 
        },
        { status: 400 }
      );
    }

    // Validate badge value
    if (!VALID_BADGES.includes(badge)) {
      return NextResponse.json(
        { 
          error: `Badge must be one of: ${VALID_BADGES.join(', ')}`,
          code: "INVALID_BADGE" 
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { 
          error: "User not found",
          code: "USER_NOT_FOUND" 
        },
        { status: 404 }
      );
    }

    const user = existingUser[0];

    // Validate user is a freelancer
    if (user.role !== 'freelancer') {
      return NextResponse.json(
        { 
          error: "User is not a freelancer",
          code: "NOT_FREELANCER" 
        },
        { status: 400 }
      );
    }

    // Update user's freelancer badge
    const updatedUser = await db.update(users)
      .set({
        freelancerBadge: badge,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { 
          error: "Failed to update user badge",
          code: "UPDATE_FAILED" 
        },
        { status: 500 }
      );
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser[0];

    return NextResponse.json(userWithoutPassword, { status: 200 });

  } catch (error) {
    console.error('POST /api/users/[id]/badge error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}