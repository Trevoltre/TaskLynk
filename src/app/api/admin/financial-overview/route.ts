import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const period = searchParams.get('period');

    // Default date range: Last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let startDate: Date;
    let endDate: Date;

    // Parse and validate dates
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);

      // Validate dates are valid ISO strings
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { 
            error: 'Invalid date format. Please use ISO 8601 format (e.g., 2024-01-01T00:00:00.000Z)',
            code: 'INVALID_DATE'
          },
          { status: 400 }
        );
      }

      // Validate startDate <= endDate
      if (startDate > endDate) {
        return NextResponse.json(
          { 
            error: 'Start date must be before or equal to end date',
            code: 'INVALID_DATE_RANGE'
          },
          { status: 400 }
        );
      }
    } else if (startDateParam || endDateParam) {
      // Both dates must be provided together
      return NextResponse.json(
        { 
          error: 'Both startDate and endDate must be provided',
          code: 'INVALID_DATE_RANGE'
        },
        { status: 400 }
      );
    } else {
      // Use default: last 30 days
      startDate = thirtyDaysAgo;
      endDate = now;
    }

    // Set time to start/end of day for proper boundary filtering
    const startDateISO = new Date(startDate.setHours(0, 0, 0, 0)).toISOString();
    const endDateISO = new Date(endDate.setHours(23, 59, 59, 999)).toISOString();

    // Calculate Total Revenue: Sum of completed job amounts where paymentConfirmed=true
    const revenueResult = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${jobs.amount}), 0)`,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'completed'),
          eq(jobs.paymentConfirmed, true),
          gte(jobs.updatedAt, startDateISO),
          lte(jobs.updatedAt, endDateISO)
        )
      );

    const totalRevenue = Number(revenueResult[0]?.totalRevenue || 0);
    const totalCosts = totalRevenue * 0.7; // Freelancer gets 70%
    const totalProfit = totalRevenue * 0.3; // Admin commission is 30%

    // Monthly Breakdown (Last 6 months)
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgoISO = sixMonthsAgo.toISOString();

    const monthlyData = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${jobs.updatedAt})`,
        revenue: sql<number>`COALESCE(SUM(${jobs.amount}), 0)`,
        completedJobs: sql<number>`COUNT(*)`,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'completed'),
          eq(jobs.paymentConfirmed, true),
          gte(jobs.updatedAt, sixMonthsAgoISO)
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${jobs.updatedAt})`)
      .orderBy(sql`strftime('%Y-%m', ${jobs.updatedAt}) DESC`);

    // Calculate costs and profit for each month
    const monthlyBreakdown = monthlyData.map((item) => {
      const revenue = Number(item.revenue);
      const costs = revenue * 0.7;
      const profit = revenue * 0.3;

      return {
        month: item.month,
        revenue: revenue,
        costs: costs,
        profit: profit,
        completedJobs: Number(item.completedJobs),
      };
    });

    return NextResponse.json({
      overview: {
        totalRevenue: totalRevenue,
        totalCosts: totalCosts,
        totalProfit: totalProfit,
        startDate: startDateISO,
        endDate: endDateISO,
      },
      monthlyBreakdown: monthlyBreakdown,
    });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}