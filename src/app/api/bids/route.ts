import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { bids } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const freelancerId = searchParams.get('freelancerId');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    let query = db.select().from(bids);

    // Build filter conditions
    const conditions = [];

    if (jobId) {
      const parsedJobId = parseInt(jobId);
      if (isNaN(parsedJobId)) {
        return NextResponse.json(
          { error: 'Invalid jobId parameter', code: 'INVALID_JOB_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(bids.jobId, parsedJobId));
    }

    if (freelancerId) {
      const parsedFreelancerId = parseInt(freelancerId);
      if (isNaN(parsedFreelancerId)) {
        return NextResponse.json(
          { error: 'Invalid freelancerId parameter', code: 'INVALID_FREELANCER_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(bids.freelancerId, parsedFreelancerId));
    }

    if (status) {
      if (!['pending', 'accepted', 'rejected'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be pending, accepted, or rejected', code: 'INVALID_STATUS' },
          { status: 400 }
        );
      }
      conditions.push(eq(bids.status, status));
    }

    // Apply filters if any exist
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply ordering and pagination
    const results = await query
      .orderBy(desc(bids.createdAt))
      .limit(limit)
      .offset(offset);

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
    const { jobId, freelancerId, message, bidAmount } = body;

    // Validate required fields
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required', code: 'MISSING_JOB_ID' },
        { status: 400 }
      );
    }

    if (!freelancerId) {
      return NextResponse.json(
        { error: 'freelancerId is required', code: 'MISSING_FREELANCER_ID' },
        { status: 400 }
      );
    }

    if (bidAmount === undefined || bidAmount === null) {
      return NextResponse.json(
        { error: 'bidAmount is required', code: 'MISSING_BID_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate jobId is a valid number
    const parsedJobId = parseInt(jobId);
    if (isNaN(parsedJobId)) {
      return NextResponse.json(
        { error: 'jobId must be a valid number', code: 'INVALID_JOB_ID' },
        { status: 400 }
      );
    }

    // Validate freelancerId is a valid number
    const parsedFreelancerId = parseInt(freelancerId);
    if (isNaN(parsedFreelancerId)) {
      return NextResponse.json(
        { error: 'freelancerId must be a valid number', code: 'INVALID_FREELANCER_ID' },
        { status: 400 }
      );
    }

    // Validate bidAmount is a valid positive number
    const parsedBidAmount = parseFloat(bidAmount);
    if (isNaN(parsedBidAmount) || parsedBidAmount <= 0) {
      return NextResponse.json(
        { error: 'bidAmount must be a positive number', code: 'INVALID_BID_AMOUNT' },
        { status: 400 }
      );
    }

    // Create new bid - message is optional (can be empty string)
    const newBid = await db.insert(bids)
      .values({
        jobId: parsedJobId,
        freelancerId: parsedFreelancerId,
        message: message?.trim() || '', // Optional message, default to empty string
        bidAmount: parsedBidAmount,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newBid[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}