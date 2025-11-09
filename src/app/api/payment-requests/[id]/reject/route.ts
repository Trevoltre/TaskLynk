import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { paymentRequests, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const paymentRequestId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { adminId, rejectionReason } = body;

    // Validate adminId is provided and valid integer
    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required', code: 'MISSING_ADMIN_ID' },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(adminId))) {
      return NextResponse.json(
        { error: 'Valid Admin ID is required', code: 'INVALID_ADMIN_ID' },
        { status: 400 }
      );
    }

    // Validate rejectionReason is provided and non-empty string
    if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim() === '') {
      return NextResponse.json(
        { error: 'Rejection reason is required', code: 'MISSING_REJECTION_REASON' },
        { status: 400 }
      );
    }

    // Check admin user exists and has role='admin'
    const admin = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(adminId)))
      .limit(1);

    if (admin.length === 0) {
      return NextResponse.json(
        { error: 'Admin not found', code: 'ADMIN_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (admin[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'User is not an admin', code: 'NOT_ADMIN' },
        { status: 403 }
      );
    }

    // Check payment request exists
    const paymentRequest = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, paymentRequestId))
      .limit(1);

    if (paymentRequest.length === 0) {
      return NextResponse.json(
        { error: 'Payment request not found', code: 'PAYMENT_REQUEST_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check payment request status is 'pending'
    if (paymentRequest[0].status !== 'pending') {
      return NextResponse.json(
        { error: 'Payment request has already been processed', code: 'ALREADY_PROCESSED' },
        { status: 400 }
      );
    }

    // Update payment request
    const updated = await db
      .update(paymentRequests)
      .set({
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
      })
      .where(eq(paymentRequests.id, paymentRequestId))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}