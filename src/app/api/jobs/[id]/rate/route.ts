import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, ratings, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { calculateClientRating, calculateFreelancerRating } from '@/lib/rating-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate jobId parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid job ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const jobId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { ratedByUserId, ratedUserId, score, comment } = body;

    // Validate required fields
    if (!ratedByUserId || !ratedUserId) {
      return NextResponse.json(
        { error: 'ratedByUserId and ratedUserId are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    // Validate score
    if (score === undefined || score === null) {
      return NextResponse.json(
        { error: 'score field is required', code: 'MISSING_SCORE' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return NextResponse.json(
        { error: 'score must be an integer between 1 and 5', code: 'INVALID_SCORE' },
        { status: 400 }
      );
    }

    // Check if job exists
    const existingJob = await db.select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 }
      );
    }

    const job = existingJob[0];
    const currentTimestamp = new Date().toISOString();

    // Create rating record
    const newRating = await db.insert(ratings).values({
      jobId: jobId,
      ratedUserId: parseInt(ratedUserId),
      ratedByUserId: parseInt(ratedByUserId),
      score: score,
      comment: comment?.trim() || null,
      createdAt: currentTimestamp,
    }).returning();

    // Update job with client rating if client is rating freelancer
    if (parseInt(ratedByUserId) === job.clientId) {
      await db.update(jobs)
        .set({
          clientRating: score,
          reviewComment: comment?.trim() || null,
          updatedAt: currentTimestamp,
        })
        .where(eq(jobs.id, jobId));

      // Recalculate freelancer rating
      const allFreelancerRatings = await db
        .select()
        .from(ratings)
        .where(eq(ratings.ratedUserId, parseInt(ratedUserId)));

      const ratingScores = allFreelancerRatings.map(r => r.score);
      
      // Get freelancer stats (simplified - you may want to fetch actual stats)
      const freelancerResult = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(ratedUserId)))
        .limit(1);

      if (freelancerResult.length > 0) {
        const freelancer = freelancerResult[0];
        const updatedRating = calculateFreelancerRating(
          freelancer.completedJobs,
          freelancer.completedJobs, // Simplified - assume all on time
          ratingScores,
          0 // Simplified - assume no revisions
        );

        await db.update(users)
          .set({
            rating: updatedRating,
            updatedAt: currentTimestamp,
          })
          .where(eq(users.id, parseInt(ratedUserId)));
      }
    }

    // Update job with writer rating if freelancer is rating client
    if (parseInt(ratedByUserId) === job.assignedFreelancerId) {
      await db.update(jobs)
        .set({
          writerRating: score,
          updatedAt: currentTimestamp,
        })
        .where(eq(jobs.id, jobId));

      // Recalculate client rating
      const clientResult = await db
        .select()
        .from(users)
        .where(eq(users.id, job.clientId))
        .limit(1);

      if (clientResult.length > 0) {
        const client = clientResult[0];
        const updatedRating = calculateClientRating(
          client.completedJobs,
          client.completedJobs, // Simplified - assume all paid on time
          client.totalSpent
        );

        await db.update(users)
          .set({
            rating: updatedRating,
            updatedAt: currentTimestamp,
          })
          .where(eq(users.id, job.clientId));
      }
    }

    // NEW: Recalculate rated user's rating as the average of the last 20 ratings (1 decimal)
    const latestRatings = await db
      .select()
      .from(ratings)
      .where(eq(ratings.ratedUserId, parseInt(ratedUserId)))
      .orderBy(desc(ratings.createdAt))
      .limit(20);

    if (latestRatings.length > 0) {
      const avgLast20 = latestRatings.reduce((sum, r) => sum + (r.score || 0), 0) / latestRatings.length;
      const rounded = Math.round(avgLast20 * 10) / 10; // 1 decimal place

      await db.update(users)
        .set({ rating: rounded, updatedAt: currentTimestamp })
        .where(eq(users.id, parseInt(ratedUserId)));
    }

    return NextResponse.json({
      rating: newRating[0],
      message: 'Rating submitted successfully and user rating updated',
    }, { status: 200 });

  } catch (error) {
    console.error('POST /api/jobs/[id]/rate error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}