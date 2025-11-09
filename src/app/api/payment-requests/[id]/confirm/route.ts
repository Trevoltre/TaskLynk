import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { paymentRequests, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate id is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { adminId } = body;

    // Validate adminId is provided and valid integer
    if (!adminId) {
      return NextResponse.json(
        {
          error: 'Admin ID is required',
          code: 'MISSING_ADMIN_ID',
        },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(adminId))) {
      return NextResponse.json(
        {
          error: 'Valid Admin ID is required',
          code: 'INVALID_ADMIN_ID',
        },
        { status: 400 }
      );
    }

    const paymentRequestId = parseInt(id);
    const adminUserId = parseInt(adminId);

    // Check admin user exists and has role='admin'
    const adminUser = await db
      .select()
      .from(users)
      .where(eq(users.id, adminUserId))
      .limit(1);

    if (adminUser.length === 0) {
      return NextResponse.json(
        {
          error: 'Admin user not found',
          code: 'ADMIN_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (adminUser[0].role !== 'admin') {
      return NextResponse.json(
        {
          error: 'User is not an admin',
          code: 'NOT_ADMIN',
        },
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
        {
          error: 'Payment request not found',
          code: 'PAYMENT_REQUEST_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check payment request status is 'pending'
    if (paymentRequest[0].status !== 'pending') {
      return NextResponse.json(
        {
          error: 'Payment request has already been processed',
          code: 'ALREADY_PROCESSED',
        },
        { status: 400 }
      );
    }

    const clientId = paymentRequest[0].clientId;
    const amount = paymentRequest[0].amount;

    // Update payment request
    const updatedPaymentRequest = await db
      .update(paymentRequests)
      .set({
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        confirmedBy: adminUserId,
      })
      .where(eq(paymentRequests.id, paymentRequestId))
      .returning();

    // Get current client balance
    const client = await db
      .select()
      .from(users)
      .where(eq(users.id, clientId))
      .limit(1);

    const currentBalance = client[0].balance || 0;
    const newBalance = currentBalance + amount;

    // Update client balance
    const updatedClient = await db
      .update(users)
      .set({
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, clientId))
      .returning();

    return NextResponse.json(
      {
        paymentRequest: updatedPaymentRequest[0],
        clientBalance: updatedClient[0].balance,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}