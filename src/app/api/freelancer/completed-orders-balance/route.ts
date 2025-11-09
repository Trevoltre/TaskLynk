import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    // Validate userId is provided
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'User ID is required',
          code: 'MISSING_USER_ID' 
        },
        { status: 400 }
      );
    }

    // Validate userId is valid integer
    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return NextResponse.json(
        { 
          error: 'Valid user ID is required',
          code: 'INVALID_USER_ID' 
        },
        { status: 400 }
      );
    }

    // Check user exists and has role='freelancer'
    const user = await db.select()
      .from(users)
      .where(eq(users.id, parsedUserId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    if (user[0].role !== 'freelancer') {
      return NextResponse.json(
        { 
          error: 'User is not a freelancer',
          code: 'NOT_FREELANCER' 
        },
        { status: 403 }
      );
    }

    // Query all completed and payment-confirmed jobs for the freelancer
    const result = await db.select({
      totalBalance: sql<number>`COALESCE(ROUND(SUM(${jobs.amount} * 0.7), 2), 0)`,
      totalCount: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(${jobs.amount}), 0)`
    })
      .from(jobs)
      .where(
        and(
          eq(jobs.assignedFreelancerId, parsedUserId),
          eq(jobs.status, 'completed'),
          eq(jobs.paymentConfirmed, true)
        )
      );

    const completedOrdersBalance = Number(result[0].totalBalance);
    const completedOrdersCount = Number(result[0].totalCount);
    const totalAmount = Number(result[0].totalAmount);
    
    // Calculate average order value (freelancer's earnings)
    const averageOrderValue = completedOrdersCount > 0 
      ? Number((completedOrdersBalance / completedOrdersCount).toFixed(2))
      : 0;

    return NextResponse.json({
      freelancerId: parsedUserId,
      completedOrdersBalance,
      completedOrdersCount,
      averageOrderValue
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}