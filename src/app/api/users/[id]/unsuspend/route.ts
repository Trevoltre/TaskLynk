import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, getAccountUnsuspendedEmailHTML } from '@/lib/email';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required' },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

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

    // Update user
    const updatedUser = await db.update(users)
      .set({
        status: 'active',
        suspendedUntil: null,
        suspensionReason: null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'Failed to unsuspend user' },
        { status: 500 }
      );
    }

    // Send email notification
    const user = updatedUser[0];
    try {
      await sendEmail({
        to: user.email,
        subject: '✅ Your TaskLynk Account Has Been Reactivated',
        html: getAccountUnsuspendedEmailHTML(user.name),
      });
    } catch (emailError) {
      console.error('Failed to send unsuspension email:', emailError);
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