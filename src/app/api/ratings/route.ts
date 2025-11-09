import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { ratings, users } from '@/db/schema';
import { eq, and, desc, avg } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const ratedUserId = searchParams.get('ratedUserId');
    const ratedByUserId = searchParams.get('ratedByUserId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    let query = db.select().from(ratings).orderBy(desc(ratings.createdAt));

    const conditions = [];
    if (jobId) {
      conditions.push(eq(ratings.jobId, parseInt(jobId)));
    }
    if (ratedUserId) {
      conditions.push(eq(ratings.ratedUserId, parseInt(ratedUserId)));
    }
    if (ratedByUserId) {
      conditions.push(eq(ratings.ratedByUserId, parseInt(ratedByUserId)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, ratedUserId, ratedByUserId, score, comment } = body;

    // Validate required fields
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required', code: 'MISSING_JOB_ID' },
        { status: 400 }
      );
    }

    if (!ratedUserId) {
      return NextResponse.json(
        { error: 'ratedUserId is required', code: 'MISSING_RATED_USER_ID' },
        { status: 400 }
      );
    }

    if (!ratedByUserId) {
      return NextResponse.json(
        { error: 'ratedByUserId is required', code: 'MISSING_RATED_BY_USER_ID' },
        { status: 400 }
      );
    }

    if (score === undefined || score === null) {
      return NextResponse.json(
        { error: 'score is required', code: 'MISSING_SCORE' },
        { status: 400 }
      );
    }

    // Validate score is integer between 1 and 5
    const scoreInt = parseInt(score);
    if (isNaN(scoreInt) || scoreInt < 1 || scoreInt > 5) {
      return NextResponse.json(
        { error: 'score must be an integer between 1 and 5', code: 'INVALID_SCORE' },
        { status: 400 }
      );
    }

    // Create rating
    const newRating = await db
      .insert(ratings)
      .values({
        jobId: parseInt(jobId),
        ratedUserId: parseInt(ratedUserId),
        ratedByUserId: parseInt(ratedByUserId),
        score: scoreInt,
        comment: comment ? comment.trim() : null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    // Calculate and update average rating for the rated user (last 20 ratings, 1 decimal)
    const latestRatings = await db
      .select()
      .from(ratings)
      .where(eq(ratings.ratedUserId, parseInt(ratedUserId)))
      .orderBy(desc(ratings.createdAt))
      .limit(20);

    if (latestRatings.length > 0) {
      const avgLast20 = latestRatings.reduce((sum, r) => sum + (r.score || 0), 0) / latestRatings.length;
      const rounded = Math.round(avgLast20 * 10) / 10; // 1 decimal place

      await db
        .update(users)
        .set({
          rating: rounded,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, parseInt(ratedUserId)));
    }

    return NextResponse.json(newRating[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}