import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, notifications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, getAccountApprovedEmailHTML, getAccountRejectedEmailHTML } from '@/lib/email';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid user ID is required',
          code: 'INVALID_USER_ID' 
        },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

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

    // Update user's approved status
    const updated = await db
      .update(users)
      .set({
        approved,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to update user',
          code: 'UPDATE_FAILED' 
        },
        { status: 500 }
      );
    }

    const user = updated[0];

    // Create notification for user
    try {
      const notificationType = approved ? 'account_approved' : 'account_rejected';
      const notificationTitle = approved ? 'Account Approved' : 'Account Rejected';
      const notificationMessage = approved 
        ? `Congratulations! Your ${user.role} account has been approved. You can now start using TaskLynk.`
        : `Your ${user.role} account application has been rejected. Please contact support for more information.`;

      await db.insert(notifications).values({
        userId: user.id,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Continue execution even if notification creation fails
    }

    // Send email notification
    try {
      if (approved) {
        // Send approval email
        await sendEmail({
          to: user.email,
          subject: '🎉 Your TaskLynk Account Has Been Approved!',
          html: getAccountApprovedEmailHTML(user.name, user.role),
        });
      } else {
        // Send rejection email
        await sendEmail({
          to: user.email,
          subject: 'TaskLynk Account Application Update',
          html: getAccountRejectedEmailHTML(user.name, user.role),
        });
      }
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Failed to send email notification:', emailError);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}