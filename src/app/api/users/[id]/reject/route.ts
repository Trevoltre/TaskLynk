import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, notifications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, getAccountRejectedEmailHTML } from '@/lib/email';

export async function POST(
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
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { reason } = body;

    // Validate reason is provided
    if (!reason) {
      return NextResponse.json(
        { 
          error: 'Rejection reason is required',
          code: 'MISSING_REASON'
        },
        { status: 400 }
      );
    }

    // Validate reason is non-empty string after trim
    const trimmedReason = reason.trim();
    if (trimmedReason.length === 0) {
      return NextResponse.json(
        { 
          error: 'Rejection reason cannot be empty',
          code: 'EMPTY_REASON'
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
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Update user with rejection details
    const updatedUser = await db
      .update(users)
      .set({
        approved: false,
        rejectedAt: new Date().toISOString(),
        rejectionReason: trimmedReason,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId))
      .returning();

    const user = updatedUser[0];

    // Create notification for user
    try {
      await db.insert(notifications).values({
        userId: user.id,
        type: 'account_rejected',
        title: 'Account Rejected',
        message: `Your ${user.role} account application has been rejected. Reason: ${trimmedReason}`,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Continue execution even if notification creation fails
    }

    // Send email notification
    try {
      await sendEmail({
        to: user.email,
        subject: 'TaskLynk Account Application Update',
        html: getAccountRejectedEmailHTML(user.name, user.role),
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Continue execution even if email fails
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 200 });

  } catch (error) {
    console.error('POST /api/users/[id]/reject error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error as Error).message
      },
      { status: 500 }
    );
  }
}