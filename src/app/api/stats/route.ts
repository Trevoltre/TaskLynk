import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, jobs, payments, bids, messages, ratings } from '@/db/schema';
import { eq, count, sum, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // User statistics
    const totalUsersResult = await db.select({ count: count() }).from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    const adminCountResult = await db.select({ count: count() })
      .from(users)
      .where(eq(users.role, 'admin'));
    const adminCount = adminCountResult[0]?.count || 0;

    const clientCountResult = await db.select({ count: count() })
      .from(users)
      .where(eq(users.role, 'client'));
    const clientCount = clientCountResult[0]?.count || 0;

    const freelancerCountResult = await db.select({ count: count() })
      .from(users)
      .where(eq(users.role, 'freelancer'));
    const freelancerCount = freelancerCountResult[0]?.count || 0;

    const approvedUsersResult = await db.select({ count: count() })
      .from(users)
      .where(eq(users.approved, true));
    const approvedUsers = approvedUsersResult[0]?.count || 0;

    const pendingUsersResult = await db.select({ count: count() })
      .from(users)
      .where(eq(users.approved, false));
    const pendingUsers = pendingUsersResult[0]?.count || 0;

    // Job statistics
    const totalJobsResult = await db.select({ count: count() }).from(jobs);
    const totalJobs = totalJobsResult[0]?.count || 0;

    const pendingJobsResult = await db.select({ count: count() })
      .from(jobs)
      .where(eq(jobs.status, 'pending'));
    const pendingJobs = pendingJobsResult[0]?.count || 0;

    const approvedJobsResult = await db.select({ count: count() })
      .from(jobs)
      .where(eq(jobs.status, 'approved'));
    const approvedJobs = approvedJobsResult[0]?.count || 0;

    const assignedJobsResult = await db.select({ count: count() })
      .from(jobs)
      .where(eq(jobs.status, 'assigned'));
    const assignedJobs = assignedJobsResult[0]?.count || 0;

    const inProgressJobsResult = await db.select({ count: count() })
      .from(jobs)
      .where(eq(jobs.status, 'in_progress'));
    const inProgressJobs = inProgressJobsResult[0]?.count || 0;

    const deliveredJobsResult = await db.select({ count: count() })
      .from(jobs)
      .where(eq(jobs.status, 'delivered'));
    const deliveredJobs = deliveredJobsResult[0]?.count || 0;

    const completedJobsResult = await db.select({ count: count() })
      .from(jobs)
      .where(eq(jobs.status, 'completed'));
    const completedJobs = completedJobsResult[0]?.count || 0;

    const cancelledJobsResult = await db.select({ count: count() })
      .from(jobs)
      .where(eq(jobs.status, 'cancelled'));
    const cancelledJobs = cancelledJobsResult[0]?.count || 0;

    const revisionJobsResult = await db.select({ count: count() })
      .from(jobs)
      .where(eq(jobs.revisionRequested, true));
    const revisionJobs = revisionJobsResult[0]?.count || 0;

    // Payment statistics
    const totalPaymentsResult = await db.select({ count: count() }).from(payments);
    const totalPayments = totalPaymentsResult[0]?.count || 0;

    const totalAmountResult = await db.select({ 
      total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` 
    }).from(payments);
    const totalAmount = totalAmountResult[0]?.total || 0;

    const pendingPaymentsResult = await db.select({ count: count() })
      .from(payments)
      .where(eq(payments.status, 'pending'));
    const pendingPayments = pendingPaymentsResult[0]?.count || 0;

    const confirmedPaymentsResult = await db.select({ count: count() })
      .from(payments)
      .where(eq(payments.status, 'confirmed'));
    const confirmedPayments = confirmedPaymentsResult[0]?.count || 0;

    const failedPaymentsResult = await db.select({ count: count() })
      .from(payments)
      .where(eq(payments.status, 'failed'));
    const failedPayments = failedPaymentsResult[0]?.count || 0;

    // Other statistics
    const totalBidsResult = await db.select({ count: count() }).from(bids);
    const totalBids = totalBidsResult[0]?.count || 0;

    const totalMessagesResult = await db.select({ count: count() }).from(messages);
    const totalMessages = totalMessagesResult[0]?.count || 0;

    const approvedMessagesResult = await db.select({ count: count() })
      .from(messages)
      .where(eq(messages.adminApproved, true));
    const approvedMessages = approvedMessagesResult[0]?.count || 0;

    const totalRatingsResult = await db.select({ count: count() }).from(ratings);
    const totalRatings = totalRatingsResult[0]?.count || 0;

    // Combine all statistics
    const statistics = {
      users: {
        totalUsers,
        adminCount,
        clientCount,
        freelancerCount,
        approvedUsers,
        pendingUsers,
      },
      jobs: {
        totalJobs,
        pendingJobs,
        approvedJobs,
        assignedJobs,
        inProgressJobs,
        deliveredJobs,
        completedJobs,
        cancelledJobs,
        revisionJobs,
      },
      payments: {
        totalPayments,
        totalAmount,
        pendingPayments,
        confirmedPayments,
        failedPayments,
      },
      other: {
        totalBids,
        totalMessages,
        approvedMessages,
        totalRatings,
      },
    };

    return NextResponse.json(statistics, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}