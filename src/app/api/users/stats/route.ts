import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, userStats } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get query parameters
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const approvedParam = searchParams.get('approved');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Validate status parameter
    if (status && !['active', 'suspended', 'blacklisted'].includes(status)) {
      return NextResponse.json({
        error: 'Invalid status parameter. Must be one of: active, suspended, blacklisted',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    // Validate role parameter - include account_owner
    if (role && !['admin', 'client', 'freelancer', 'account_owner'].includes(role)) {
      return NextResponse.json({
        error: 'Invalid role parameter. Must be one of: admin, client, freelancer, account_owner',
        code: 'INVALID_ROLE'
      }, { status: 400 });
    }

    // Build where conditions
    const whereConditions = [];

    if (status) {
      whereConditions.push(eq(users.status, status));
    }

    if (role) {
      whereConditions.push(eq(users.role, role));
    }

    if (approvedParam !== null) {
      const approved = approvedParam === 'true';
      whereConditions.push(eq(users.approved, approved));
    }

    // Build the query with LEFT JOIN
    let query = db
      .select({
        // Users table fields
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        approved: users.approved,
        balance: users.balance,
        rating: users.rating,
        totalEarned: users.totalEarned,
        totalSpent: users.totalSpent,
        completedJobs: users.completedJobs,
        completionRate: users.completionRate,
        createdAt: users.createdAt,
        // UserStats table fields
        statsId: userStats.id,
        totalJobsPosted: userStats.totalJobsPosted,
        totalJobsCompleted: userStats.totalJobsCompleted,
        totalJobsCancelled: userStats.totalJobsCancelled,
        totalAmountEarned: userStats.totalAmountEarned,
        totalAmountSpent: userStats.totalAmountSpent,
        averageRating: userStats.averageRating,
        totalRatings: userStats.totalRatings,
        onTimeDelivery: userStats.onTimeDelivery,
        lateDelivery: userStats.lateDelivery,
        revisionsRequested: userStats.revisionsRequested,
        statsCreatedAt: userStats.createdAt,
        statsUpdatedAt: userStats.updatedAt
      })
      .from(users)
      .leftJoin(userStats, eq(users.id, userStats.userId));

    // Apply where conditions if any
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Apply ordering, limit, and offset
    const results = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Transform results to combine user and stats data
    const formattedResults = results.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status,
      approved: row.approved,
      balance: row.balance,
      rating: row.rating,
      totalEarned: row.totalEarned,
      totalSpent: row.totalSpent,
      completedJobs: row.completedJobs,
      completionRate: row.completionRate,
      createdAt: row.createdAt,
      stats: row.statsId ? {
        id: row.statsId,
        totalJobsPosted: row.totalJobsPosted,
        totalJobsCompleted: row.totalJobsCompleted,
        totalJobsCancelled: row.totalJobsCancelled,
        totalAmountEarned: row.totalAmountEarned,
        totalAmountSpent: row.totalAmountSpent,
        averageRating: row.averageRating,
        totalRatings: row.totalRatings,
        onTimeDelivery: row.onTimeDelivery,
        lateDelivery: row.lateDelivery,
        revisionsRequested: row.revisionsRequested,
        createdAt: row.statsCreatedAt,
        updatedAt: row.statsUpdatedAt
      } : null
    }));

    return NextResponse.json(formattedResults, { status: 200 });
  } catch (error) {
    console.error('GET /api/users/stats error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}