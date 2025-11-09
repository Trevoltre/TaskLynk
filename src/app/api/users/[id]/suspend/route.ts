import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, getAccountSuspendedEmailHTML } from '@/lib/email';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
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
    const { duration, reason } = body;

    // Validate duration
    if (duration === undefined || duration === null) {
      return NextResponse.json(
        { 
          error: 'Duration is required',
          code: 'MISSING_DURATION' 
        },
        { status: 400 }
      );
    }

    if (typeof duration !== 'number' || isNaN(duration)) {
      return NextResponse.json(
        { 
          error: 'Duration must be a valid number',
          code: 'INVALID_DURATION' 
        },
        { status: 400 }
      );
    }

    if (duration <= 0) {
      return NextResponse.json(
        { 
          error: 'Duration must be greater than 0',
          code: 'INVALID_DURATION' 
        },
        { status: 400 }
      );
    }

    // Validate reason
    if (!reason) {
      return NextResponse.json(
        { 
          error: 'Reason is required',
          code: 'MISSING_REASON' 
        },
        { status: 400 }
      );
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length === 0) {
      return NextResponse.json(
        { 
          error: 'Reason cannot be empty',
          code: 'INVALID_REASON' 
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
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate suspension end date
    const suspendedUntil = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

    // Update user
    const updatedUser = await db.update(users)
      .set({
        status: 'suspended',
        suspendedUntil,
        suspensionReason: trimmedReason,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'Failed to suspend user' },
        { status: 500 }
      );
    }

    // Send email notification
    const user = updatedUser[0];
    try {
      await sendEmail({
        to: user.email,
        subject: '⚠️ Your TaskLynk Account Has Been Suspended',
        html: getAccountSuspendedEmailHTML(user.name, trimmedReason, suspendedUntil),
      });
    } catch (emailError) {
      console.error('Failed to send suspension email:', emailError);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 200 });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}