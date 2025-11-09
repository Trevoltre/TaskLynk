import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, jobs, users } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId: clientIdParam } = await params;
    const { searchParams } = new URL(request.url);

    // Validate clientId
    if (!clientIdParam) {
      return NextResponse.json(
        { 
          error: 'Client ID is required',
          code: 'INVALID_CLIENT_ID'
        },
        { status: 400 }
      );
    }

    const clientId = parseInt(clientIdParam);
    if (isNaN(clientId)) {
      return NextResponse.json(
        { 
          error: 'Valid Client ID is required',
          code: 'INVALID_CLIENT_ID'
        },
        { status: 400 }
      );
    }

    // Validate and parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Check if client exists
    const clientResult = await db.select({
      id: users.id,
      totalSpent: users.totalSpent,
      balance: users.balance
    })
      .from(users)
      .where(eq(users.id, clientId))
      .limit(1);

    if (clientResult.length === 0) {
      return NextResponse.json(
        { 
          error: 'Client not found',
          code: 'CLIENT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const client = clientResult[0];

    // Calculate total spent (sum of confirmed payment amounts)
    const totalSpentResult = await db.select({
      total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`
    })
      .from(payments)
      .where(
        and(
          eq(payments.clientId, clientId),
          eq(payments.status, 'confirmed')
        )
      );

    const totalAmountSpent = totalSpentResult[0]?.total || 0;

    // Count total orders (all jobs created by client)
    const totalOrdersResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
      .from(jobs)
      .where(eq(jobs.clientId, clientId));

    const totalOrders = totalOrdersResult[0]?.count || 0;

    // Count completed orders
    const completedOrdersResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
      .from(jobs)
      .where(
        and(
          eq(jobs.clientId, clientId),
          eq(jobs.status, 'completed')
        )
      );

    const completedOrders = completedOrdersResult[0]?.count || 0;

    // Count pending payments
    const pendingPaymentsResult = await db.select({
      count: sql<number>`COUNT(*)`
    })
      .from(payments)
      .where(
        and(
          eq(payments.clientId, clientId),
          eq(payments.status, 'pending')
        )
      );

    const pendingPayments = pendingPaymentsResult[0]?.count || 0;

    // Fetch transaction history with job details (with pagination)
    const transactionsResult = await db.select({
      id: payments.id,
      amount: payments.amount,
      status: payments.status,
      paymentMethod: payments.paymentMethod,
      confirmedAt: payments.confirmedAt,
      createdAt: payments.createdAt,
      jobId: jobs.id,
      jobDisplayId: jobs.displayId,
      jobTitle: jobs.title,
      jobStatus: jobs.status
    })
      .from(payments)
      .leftJoin(jobs, eq(payments.jobId, jobs.id))
      .where(eq(payments.clientId, clientId))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    // Format transactions
    const transactions = transactionsResult.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      confirmedAt: transaction.confirmedAt,
      createdAt: transaction.createdAt,
      job: transaction.jobId ? {
        id: transaction.jobId,
        displayId: transaction.jobDisplayId,
        title: transaction.jobTitle,
        status: transaction.jobStatus
      } : null
    }));

    // Build response
    const response = {
      clientId: clientId,
      summary: {
        totalAmountSpent: totalAmountSpent,
        currentBalance: client.balance || 0,
        totalOrders: totalOrders,
        completedOrders: completedOrders,
        pendingPayments: pendingPayments
      },
      transactions: transactions
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}