import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, payments, users } from '@/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract and validate query parameters
    const period = searchParams.get('period') ?? 'daily';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    
    // Validate period
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json({ 
        error: "Invalid period. Must be 'daily', 'weekly', or 'monthly'",
        code: "INVALID_PERIOD" 
      }, { status: 400 });
    }

    // Validate and parse dates
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let startDate: Date;
    let endDate: Date;

    try {
      startDate = searchParams.get('startDate') 
        ? new Date(searchParams.get('startDate')!) 
        : defaultStartDate;
      endDate = searchParams.get('endDate') 
        ? new Date(searchParams.get('endDate')!) 
        : now;
    } catch (error) {
      return NextResponse.json({ 
        error: "Invalid date format. Use ISO date strings",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ 
        error: "startDate cannot be after endDate",
        code: "INVALID_DATE_RANGE" 
      }, { status: 400 });
    }

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // Calculate previous period for growth rate
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousStartDateStr = previousStartDate.toISOString();

    // 1. Company Profit - Admin's 30% commission from completed jobs
    const companyProfitResult = await db
      .select({
        profit: sql<number>`COALESCE(ROUND(SUM(${jobs.amount} * 0.3), 2), 0)`
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'completed'),
          eq(jobs.paymentConfirmed, true),
          gte(jobs.updatedAt, startDateStr),
          lte(jobs.updatedAt, endDateStr)
        )
      );

    const companyProfit = companyProfitResult[0]?.profit ?? 0;

    // 2. Total Revenue - Sum of confirmed payments
    const totalRevenueResult = await db
      .select({
        revenue: sql<number>`COALESCE(ROUND(SUM(${payments.amount}), 2), 0)`
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'confirmed'),
          gte(payments.createdAt, startDateStr),
          lte(payments.createdAt, endDateStr)
        )
      );

    const totalRevenue = totalRevenueResult[0]?.revenue ?? 0;

    // Previous period revenue for growth rate
    const previousRevenueResult = await db
      .select({
        revenue: sql<number>`COALESCE(ROUND(SUM(${payments.amount}), 2), 0)`
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'confirmed'),
          gte(payments.createdAt, previousStartDateStr),
          lte(payments.createdAt, startDateStr)
        )
      );

    const previousRevenue = previousRevenueResult[0]?.revenue ?? 0;

    // 3. Total Freelancer Payouts - 70% of completed job amounts
    const freelancerPayoutsResult = await db
      .select({
        payouts: sql<number>`COALESCE(ROUND(SUM(${jobs.amount} * 0.7), 2), 0)`
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'completed'),
          eq(jobs.paymentConfirmed, true),
          gte(jobs.updatedAt, startDateStr),
          lte(jobs.updatedAt, endDateStr)
        )
      );

    const totalFreelancerPayouts = freelancerPayoutsResult[0]?.payouts ?? 0;

    // 4. Revenue by Time Period
    let dateGroupFormat: string;
    switch (period) {
      case 'daily':
        dateGroupFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateGroupFormat = '%Y-W%W';
        break;
      case 'monthly':
        dateGroupFormat = '%Y-%m';
        break;
      default:
        dateGroupFormat = '%Y-%m-%d';
    }

    const revenueByTimePeriod = await db
      .select({
        date: sql<string>`strftime('${sql.raw(dateGroupFormat)}', ${payments.confirmedAt})`,
        revenue: sql<number>`COALESCE(ROUND(SUM(${payments.amount}), 2), 0)`
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'confirmed'),
          gte(payments.confirmedAt, startDateStr),
          lte(payments.confirmedAt, endDateStr)
        )
      )
      .groupBy(sql`strftime('${sql.raw(dateGroupFormat)}', ${payments.confirmedAt})`)
      .orderBy(sql`strftime('${sql.raw(dateGroupFormat)}', ${payments.confirmedAt})`);

    // 5. Jobs by Status (current counts)
    const jobsByStatusResult = await db
      .select({
        status: jobs.status,
        count: sql<number>`COUNT(*)`
      })
      .from(jobs)
      .where(
        and(
          gte(jobs.createdAt, startDateStr),
          lte(jobs.createdAt, endDateStr)
        )
      )
      .groupBy(jobs.status);

    const jobsByStatus = {
      pending: 0,
      approved: 0,
      assigned: 0,
      in_progress: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0
    };

    jobsByStatusResult.forEach(row => {
      if (row.status in jobsByStatus) {
        jobsByStatus[row.status as keyof typeof jobsByStatus] = Number(row.count);
      }
    });

    // Jobs by Status Over Time (last 6 months or date range)
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
    const statusStartDate = startDate < sixMonthsAgo ? sixMonthsAgo : startDate;
    const statusStartDateStr = statusStartDate.toISOString();

    const jobsByStatusOverTime = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${jobs.createdAt})`,
        status: jobs.status,
        count: sql<number>`COUNT(*)`
      })
      .from(jobs)
      .where(
        and(
          gte(jobs.createdAt, statusStartDateStr),
          lte(jobs.createdAt, endDateStr)
        )
      )
      .groupBy(
        sql`strftime('%Y-%m', ${jobs.createdAt})`,
        jobs.status
      )
      .orderBy(sql`strftime('%Y-%m', ${jobs.createdAt})`);

    // Transform jobs by status over time into array of objects
    const statusByMonthMap = new Map<string, any>();
    jobsByStatusOverTime.forEach(row => {
      if (!statusByMonthMap.has(row.month)) {
        statusByMonthMap.set(row.month, {
          month: row.month,
          pending: 0,
          approved: 0,
          assigned: 0,
          in_progress: 0,
          delivered: 0,
          completed: 0,
          cancelled: 0
        });
      }
      const monthData = statusByMonthMap.get(row.month);
      if (row.status in monthData) {
        monthData[row.status] = Number(row.count);
      }
    });

    const jobsByStatusOverTimeArray = Array.from(statusByMonthMap.values());

    // 6. Top Performing Freelancers
    const topFreelancers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        rating: users.rating,
        totalEarnings: sql<number>`COALESCE(ROUND(SUM(${jobs.amount} * 0.7), 2), 0)`,
        completedJobs: sql<number>`COUNT(${jobs.id})`
      })
      .from(users)
      .leftJoin(jobs, and(
        eq(jobs.assignedFreelancerId, users.id),
        eq(jobs.status, 'completed'),
        eq(jobs.paymentConfirmed, true),
        gte(jobs.updatedAt, startDateStr),
        lte(jobs.updatedAt, endDateStr)
      ))
      .where(eq(users.role, 'freelancer'))
      .groupBy(users.id, users.name, users.email, users.rating)
      .orderBy(desc(sql`SUM(${jobs.amount})`))
      .limit(limit);

    const topFreelancersFormatted = topFreelancers.map(f => ({
      id: f.id,
      name: f.name,
      email: f.email,
      totalEarnings: f.totalEarnings ?? 0,
      completedJobs: f.completedJobs ?? 0,
      rating: f.rating ?? 0
    }));

    // 7. Top Clients
    const topClients = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        totalSpent: sql<number>`COALESCE(ROUND(SUM(${jobs.amount}), 2), 0)`,
        totalJobs: sql<number>`COUNT(${jobs.id})`
      })
      .from(users)
      .leftJoin(jobs, and(
        eq(jobs.clientId, users.id),
        eq(jobs.status, 'completed'),
        eq(jobs.paymentConfirmed, true),
        gte(jobs.updatedAt, startDateStr),
        lte(jobs.updatedAt, endDateStr)
      ))
      .where(sql`${users.role} IN ('client', 'account_owner')`)
      .groupBy(users.id, users.name, users.email)
      .orderBy(desc(sql`SUM(${jobs.amount})`))
      .limit(limit);

    const topClientsFormatted = topClients.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      totalSpent: c.totalSpent ?? 0,
      totalJobs: c.totalJobs ?? 0
    }));

    // 8. Payment Success Rate
    const paymentStatsResult = await db
      .select({
        status: payments.status,
        count: sql<number>`COUNT(*)`
      })
      .from(payments)
      .where(
        and(
          gte(payments.createdAt, startDateStr),
          lte(payments.createdAt, endDateStr)
        )
      )
      .groupBy(payments.status);

    let confirmedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    paymentStatsResult.forEach(row => {
      const count = Number(row.count);
      if (row.status === 'confirmed') confirmedCount = count;
      else if (row.status === 'pending') pendingCount = count;
      else if (row.status === 'failed') failedCount = count;
    });

    const totalPayments = confirmedCount + pendingCount + failedCount;
    const successRate = totalPayments > 0 
      ? Math.round((confirmedCount / totalPayments) * 100 * 100) / 100 
      : 0;

    // 9. Average Order Value
    const completedJobsResult = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${jobs.amount}), 0)`,
        totalJobs: sql<number>`COUNT(*)`
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'completed'),
          gte(jobs.updatedAt, startDateStr),
          lte(jobs.updatedAt, endDateStr)
        )
      );

    const totalJobRevenue = completedJobsResult[0]?.totalRevenue ?? 0;
    const totalCompletedJobs = completedJobsResult[0]?.totalJobs ?? 0;
    const averageOrderValue = totalCompletedJobs > 0 
      ? Math.round((totalJobRevenue / totalCompletedJobs) * 100) / 100 
      : 0;

    // 10. Revenue Growth Rate
    const growthRate = previousRevenue > 0 
      ? totalRevenue - previousRevenue 
      : totalRevenue;
    const growthPercentage = previousRevenue > 0 
      ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100 * 100) / 100 
      : 100;

    // 11. Job Completion Rate
    const allJobsResult = await db
      .select({
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`SUM(CASE WHEN ${jobs.status} = 'completed' THEN 1 ELSE 0 END)`
      })
      .from(jobs)
      .where(
        and(
          gte(jobs.createdAt, startDateStr),
          lte(jobs.createdAt, endDateStr)
        )
      );

    const totalJobsCreated = Number(allJobsResult[0]?.total ?? 0);
    const completedJobsCount = Number(allJobsResult[0]?.completed ?? 0);
    const completionRate = totalJobsCreated > 0 
      ? Math.round((completedJobsCount / totalJobsCreated) * 100 * 100) / 100 
      : 0;

    // Build final response
    const response = {
      overview: {
        companyProfit,
        totalRevenue,
        totalFreelancerPayouts,
        averageOrderValue,
        jobCompletionRate: {
          completionRate,
          completed: completedJobsCount,
          total: totalJobsCreated
        }
      },
      revenue: {
        byTimePeriod: revenueByTimePeriod.map(r => ({
          date: r.date ?? '',
          revenue: r.revenue ?? 0
        })),
        growthRate: {
          current: totalRevenue,
          previous: previousRevenue,
          growthRate,
          growthPercentage
        }
      },
      jobs: {
        byStatus: jobsByStatus,
        byStatusOverTime: jobsByStatusOverTimeArray
      },
      payments: {
        successRate: {
          successRate,
          confirmed: confirmedCount,
          pending: pendingCount,
          failed: failedCount,
          total: totalPayments
        }
      },
      topPerformers: {
        freelancers: topFreelancersFormatted,
        clients: topClientsFormatted
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('GET analytics error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}