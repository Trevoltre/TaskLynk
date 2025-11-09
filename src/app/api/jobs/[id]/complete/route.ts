import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, users, ratings, userStats } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { calculateFreelancerAmount } from '@/lib/payment-calculations';
import { calculateClientRating, calculateFreelancerRating, wasDeliveredOnTime } from '@/lib/rating-utils';
import { calculateClientTier, calculateFreelancerBadge } from '@/lib/status-calculator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    const jobId = parseInt(id);

    // Check if job exists
    const existingJob = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json(
        {
          error: 'Job not found',
          code: 'JOB_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const job = existingJob[0];

    // Check if job has assigned freelancer
    if (!job.assignedFreelancerId) {
      return NextResponse.json(
        {
          error: 'Job has no assigned freelancer',
          code: 'NO_ASSIGNED_FREELANCER',
        },
        { status: 400 }
      );
    }

    // Get freelancer details
    const freelancerResult = await db
      .select()
      .from(users)
      .where(eq(users.id, job.assignedFreelancerId))
      .limit(1);

    if (freelancerResult.length === 0) {
      return NextResponse.json(
        {
          error: 'Freelancer not found',
          code: 'FREELANCER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Get client details
    const clientResult = await db
      .select()
      .from(users)
      .where(eq(users.id, job.clientId))
      .limit(1);

    if (clientResult.length === 0) {
      return NextResponse.json(
        {
          error: 'Client not found',
          code: 'CLIENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const freelancer = freelancerResult[0];
    const client = clientResult[0];
    const currentTimestamp = new Date().toISOString();

    // Calculate 70% earnings for freelancer
    const freelancerEarnings = calculateFreelancerAmount(job.amount);

    // **CRITICAL: AUTOMATED BALANCE MANAGEMENT**
    // If payment is confirmed, add to balance (this ensures revision completions also add balance back)
    let newBalance = freelancer.balance;
    let balanceAdded = false;
    
    if (job.paymentConfirmed) {
      newBalance = freelancer.balance + freelancerEarnings;
      balanceAdded = true;
    }

    const newTotalEarned = freelancer.totalEarned + freelancerEarnings;
    const newCompletedJobs = freelancer.completedJobs + 1;

    // Get freelancer stats for rating calculation
    const freelancerStatsResult = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, job.assignedFreelancerId))
      .limit(1);

    let onTimeDelivery = 0;
    let revisionsRequested = 0;

    if (freelancerStatsResult.length > 0) {
      onTimeDelivery = freelancerStatsResult[0].onTimeDelivery;
      revisionsRequested = freelancerStatsResult[0].revisionsRequested;
    }

    // Check if this delivery was on time
    const deliveredOnTime = wasDeliveredOnTime(job.actualDeadline, currentTimestamp);
    if (deliveredOnTime) {
      onTimeDelivery++;
    }

    // Get all client ratings for this freelancer
    const freelancerRatings = await db
      .select()
      .from(ratings)
      .where(eq(ratings.ratedUserId, job.assignedFreelancerId));

    const clientRatingScores = freelancerRatings.map(r => r.score);

    // Calculate freelancer rating
    const freelancerRating = calculateFreelancerRating(
      newCompletedJobs,
      onTimeDelivery,
      clientRatingScores,
      revisionsRequested
    );

    // **AUTOMATIC STATUS UPDATE: Calculate freelancer badge based on completed orders**
    const newFreelancerBadge = calculateFreelancerBadge(newCompletedJobs);

    // Update freelancer's balance, earnings, rating, and badge
    const updatedFreelancer = await db
      .update(users)
      .set({
        balance: newBalance,
        totalEarned: newTotalEarned,
        completedJobs: newCompletedJobs,
        rating: freelancerRating,
        freelancerBadge: newFreelancerBadge,
        updatedAt: currentTimestamp,
      })
      .where(eq(users.id, job.assignedFreelancerId))
      .returning();

    // **CRITICAL: Recalculate balance from completed & paid jobs to maintain accuracy**
    if (job.paymentConfirmed) {
      try {
        const agg = await db
          .select({
            totalBalance: sql<number>`COALESCE(ROUND(SUM(${jobs.amount} * 0.7), 2), 0)`,
          })
          .from(jobs)
          .where(and(
            eq(jobs.assignedFreelancerId, job.assignedFreelancerId),
            eq(jobs.status, 'completed'),
            eq(jobs.paymentConfirmed, true)
          ));

        const computedBalance = Number(agg[0]?.totalBalance || 0);
        await db.update(users)
          .set({ balance: computedBalance, updatedAt: currentTimestamp })
          .where(eq(users.id, job.assignedFreelancerId));
          
        newBalance = computedBalance;
      } catch (recalcErr) {
        console.error('Balance recalculation error:', recalcErr);
      }
    }

    // Update freelancer stats
    if (freelancerStatsResult.length > 0) {
      await db
        .update(userStats)
        .set({
          totalJobsCompleted: newCompletedJobs,
          totalAmountEarned: newTotalEarned,
          onTimeDelivery: onTimeDelivery,
          updatedAt: currentTimestamp,
        })
        .where(eq(userStats.userId, job.assignedFreelancerId));
    } else {
      await db.insert(userStats).values({
        userId: job.assignedFreelancerId,
        totalJobsCompleted: newCompletedJobs,
        totalAmountEarned: newTotalEarned,
        onTimeDelivery: onTimeDelivery,
        lateDelivery: deliveredOnTime ? 0 : 1,
        revisionsRequested: 0,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      });
    }

    // Update client stats and rating
    const clientStatsResult = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, job.clientId))
      .limit(1);

    const newClientCompletedJobs = client.completedJobs + 1;
    const newClientTotalSpent = client.totalSpent + job.amount;

    // Get payment reliability (assuming paid on time if payment confirmed)
    const paidOnTime = job.paymentConfirmed ? newClientCompletedJobs : newClientCompletedJobs - 1;

    // Calculate client rating
    const clientRating = calculateClientRating(
      newClientCompletedJobs,
      paidOnTime,
      newClientTotalSpent
    );

    // **AUTOMATIC STATUS UPDATE: Calculate client tier based on completed orders**
    const newClientTier = calculateClientTier(newClientCompletedJobs);

    // Update client stats and tier
    await db
      .update(users)
      .set({
        completedJobs: newClientCompletedJobs,
        totalSpent: newClientTotalSpent,
        rating: clientRating,
        clientTier: newClientTier,
        updatedAt: currentTimestamp,
      })
      .where(eq(users.id, job.clientId));

    if (clientStatsResult.length > 0) {
      await db
        .update(userStats)
        .set({
          totalJobsCompleted: newClientCompletedJobs,
          totalAmountSpent: newClientTotalSpent,
          updatedAt: currentTimestamp,
        })
        .where(eq(userStats.userId, job.clientId));
    } else {
      await db.insert(userStats).values({
        userId: job.clientId,
        totalJobsCompleted: newClientCompletedJobs,
        totalAmountSpent: newClientTotalSpent,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      });
    }

    // Update job status to completed
    const updatedJob = await db
      .update(jobs)
      .set({
        status: 'completed',
        updatedAt: currentTimestamp,
      })
      .where(eq(jobs.id, jobId))
      .returning();

    // Remove password from response
    const { password, ...freelancerWithoutPassword } = updatedFreelancer[0];

    return NextResponse.json({
      job: updatedJob[0],
      freelancer: freelancerWithoutPassword,
      earnedAmount: freelancerEarnings,
      newBalance: newBalance,
      balanceAdded: balanceAdded,
      freelancerRating: freelancerRating,
      clientRating: clientRating,
      freelancerBadge: newFreelancerBadge,
      clientTier: newClientTier,
      message: balanceAdded 
        ? 'Job completed successfully. Freelancer balance updated (payment already confirmed).' 
        : 'Job completed successfully. Balance will be added when payment is confirmed.',
    }, { status: 200 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}