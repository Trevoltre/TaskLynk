import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { paymentRequests, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Validate status if provided
    if (status && !['pending', 'confirmed', 'rejected'].includes(status)) {
      return NextResponse.json({
        error: 'Invalid status. Must be: pending, confirmed, or rejected',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    // Validate clientId if provided
    if (clientId && isNaN(parseInt(clientId))) {
      return NextResponse.json({
        error: 'Invalid client ID',
        code: 'INVALID_CLIENT_ID'
      }, { status: 400 });
    }

    // Build query with joins
    let query = db
      .select({
        id: paymentRequests.id,
        clientId: paymentRequests.clientId,
        amount: paymentRequests.amount,
        status: paymentRequests.status,
        paymentMethod: paymentRequests.paymentMethod,
        phoneNumber: paymentRequests.phoneNumber,
        transactionReference: paymentRequests.transactionReference,
        confirmedAt: paymentRequests.confirmedAt,
        confirmedBy: paymentRequests.confirmedBy,
        rejectionReason: paymentRequests.rejectionReason,
        createdAt: paymentRequests.createdAt,
        client: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      })
      .from(paymentRequests)
      .innerJoin(users, eq(paymentRequests.clientId, users.id));

    // Apply filters
    const conditions = [];
    if (status) {
      conditions.push(eq(paymentRequests.status, status));
    }
    if (clientId) {
      conditions.push(eq(paymentRequests.clientId, parseInt(clientId)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply ordering, limit and offset
    const results = await query
      .orderBy(desc(paymentRequests.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, amount, paymentMethod, phoneNumber, transactionReference } = body;

    // Validate required fields
    if (!clientId) {
      return NextResponse.json({
        error: 'Client ID is required',
        code: 'MISSING_CLIENT_ID'
      }, { status: 400 });
    }

    if (!amount) {
      return NextResponse.json({
        error: 'Amount is required',
        code: 'MISSING_AMOUNT'
      }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json({
        error: 'Payment method is required',
        code: 'MISSING_PAYMENT_METHOD'
      }, { status: 400 });
    }

    if (!phoneNumber) {
      return NextResponse.json({
        error: 'Phone number is required',
        code: 'MISSING_PHONE_NUMBER'
      }, { status: 400 });
    }

    if (!transactionReference) {
      return NextResponse.json({
        error: 'Transaction reference is required',
        code: 'MISSING_TRANSACTION_REFERENCE'
      }, { status: 400 });
    }

    // Validate clientId is valid integer
    if (isNaN(parseInt(clientId))) {
      return NextResponse.json({
        error: 'Client ID must be a valid integer',
        code: 'INVALID_CLIENT_ID'
      }, { status: 400 });
    }

    // Validate amount is positive number
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({
        error: 'Amount must be a positive number',
        code: 'INVALID_AMOUNT'
      }, { status: 400 });
    }

    // Validate paymentMethod is non-empty string
    if (typeof paymentMethod !== 'string' || paymentMethod.trim() === '') {
      return NextResponse.json({
        error: 'Payment method must be a non-empty string',
        code: 'INVALID_PAYMENT_METHOD'
      }, { status: 400 });
    }

    // Validate phoneNumber is non-empty string
    if (typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
      return NextResponse.json({
        error: 'Phone number must be a non-empty string',
        code: 'INVALID_PHONE_NUMBER'
      }, { status: 400 });
    }

    // Validate transactionReference is non-empty string
    if (typeof transactionReference !== 'string' || transactionReference.trim() === '') {
      return NextResponse.json({
        error: 'Transaction reference must be a non-empty string',
        code: 'INVALID_TRANSACTION_REFERENCE'
      }, { status: 400 });
    }

    // Check if client exists
    const client = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(clientId)))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 404 });
    }

    // Check user role
    if (client[0].role !== 'client' && client[0].role !== 'account_owner') {
      return NextResponse.json({
        error: 'User must be a client or account owner',
        code: 'NOT_CLIENT_ROLE'
      }, { status: 400 });
    }

    // Create payment request
    const now = new Date().toISOString();
    const newPaymentRequest = await db.insert(paymentRequests)
      .values({
        clientId: parseInt(clientId),
        amount: parseFloat(amount),
        paymentMethod: paymentMethod.trim(),
        phoneNumber: phoneNumber.trim(),
        transactionReference: transactionReference.trim(),
        status: 'pending',
        createdAt: now,
      })
      .returning();

    return NextResponse.json(newPaymentRequest[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}