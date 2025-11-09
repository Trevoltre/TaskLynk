import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_TIERS = ['basic', 'silver', 'gold', 'platinum'] as const;
type ClientTier = typeof VALID_TIERS[number];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
    const { tier } = body;

    // Validate tier field
    if (!tier) {
      return NextResponse.json(
        { 
          error: "Tier is required",
          code: "MISSING_TIER" 
        }, 
        { status: 400 }
      );
    }

    // Validate tier value
    if (!VALID_TIERS.includes(tier as ClientTier)) {
      return NextResponse.json(
        { 
          error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}`,
          code: "INVALID_TIER" 
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

    // Validate user is a client or account_owner
    if (user.role !== 'client' && user.role !== 'account_owner') {
      return NextResponse.json(
        { 
          error: "Tier can only be set for client or account_owner users",
          code: "NOT_CLIENT_OR_ACCOUNT_OWNER" 
        }, 
        { status: 400 }
      );
    }

    // Update user's clientTier
    const updatedUser = await db.update(users)
      .set({
        clientTier: tier,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { 
          error: "Failed to update user tier",
          code: "UPDATE_FAILED" 
        }, 
        { status: 500 }
      );
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser[0];

    return NextResponse.json(userWithoutPassword, { status: 200 });

  } catch (error) {
    console.error('POST /api/users/[id]/tier error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      }, 
      { status: 500 }
    );
  }
}