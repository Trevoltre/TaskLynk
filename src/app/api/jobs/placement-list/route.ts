import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

const VALID_STATUSES = [
  'pending',
  'approved',
  'assigned',
  'in_progress',
  'delivered',
  'revision',
  'completed',
  'cancelled'
] as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate query parameters
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Validate status parameter if provided
    if (status && !VALID_STATUSES.includes(status as any)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // Validate pagination parameters
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        {
          error: 'Invalid limit parameter. Must be a positive number.',
          code: 'INVALID_LIMIT'
        },
        { status: 400 }
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        {
          error: 'Invalid offset parameter. Must be a non-negative number.',
          code: 'INVALID_OFFSET'
        },
        { status: 400 }
      );
    }

    // Build query with filters
    let query = db.select().from(jobs);

    // Apply status filter if provided
    if (status) {
      query = query.where(eq(jobs.status, status));
    }

    // Sort by placement priority (descending) then createdAt (descending)
    query = query
      .orderBy(desc(jobs.placementPriority), desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    // Execute query
    const results = await query;

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET /api/jobs/placement-list error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}