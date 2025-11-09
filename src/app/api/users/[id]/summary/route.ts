import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, userStats } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

    // Query user by ID
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Return 404 if user not found
    if (userResult.length === 0) {
      return NextResponse.json(
        {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const user = userResult[0];

    // Query userStats by userId
    const statsResult = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    // Build response object with user data (excluding password) and stats
    const { password, ...userWithoutPassword } = user;

    const summary = {
      user: {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        name: userWithoutPassword.name,
        role: userWithoutPassword.role,
        status: userWithoutPassword.status,
        approved: userWithoutPassword.approved,
        balance: userWithoutPassword.balance,
        rating: userWithoutPassword.rating,
        phone: userWithoutPassword.phone,
        totalEarned: userWithoutPassword.totalEarned,
        totalSpent: userWithoutPassword.totalSpent,
        completedJobs: userWithoutPassword.completedJobs,
        completionRate: userWithoutPassword.completionRate,
        suspendedUntil: userWithoutPassword.suspendedUntil,
        suspensionReason: userWithoutPassword.suspensionReason,
        blacklistReason: userWithoutPassword.blacklistReason,
        rejectedAt: userWithoutPassword.rejectedAt,
        rejectionReason: userWithoutPassword.rejectionReason,
        createdAt: userWithoutPassword.createdAt,
        updatedAt: userWithoutPassword.updatedAt,
      },
      stats: statsResult.length > 0
        ? {
            totalJobsPosted: statsResult[0].totalJobsPosted,
            totalJobsCompleted: statsResult[0].totalJobsCompleted,
            totalJobsCancelled: statsResult[0].totalJobsCancelled,
            totalAmountEarned: statsResult[0].totalAmountEarned,
            totalAmountSpent: statsResult[0].totalAmountSpent,
            averageRating: statsResult[0].averageRating,
            totalRatings: statsResult[0].totalRatings,
            onTimeDelivery: statsResult[0].onTimeDelivery,
            lateDelivery: statsResult[0].lateDelivery,
            revisionsRequested: statsResult[0].revisionsRequested,
          }
        : null,
    };

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}