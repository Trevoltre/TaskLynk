import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { domains, users } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Validate status parameter if provided
    if (status && !['active', 'inactive', 'suspended'].includes(status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status value. Must be active, inactive, or suspended',
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // Build query with left join to count users
    let query = db
      .select({
        id: domains.id,
        name: domains.name,
        description: domains.description,
        status: domains.status,
        maxUsers: domains.maxUsers,
        userCount: sql<number>`CAST(COUNT(DISTINCT ${users.id}) AS INTEGER)`,
        createdAt: domains.createdAt,
        updatedAt: domains.updatedAt,
      })
      .from(domains)
      .leftJoin(users, eq(domains.id, users.domainId))
      .groupBy(domains.id)
      .orderBy(desc(domains.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply status filter if provided
    if (status) {
      query = db
        .select({
          id: domains.id,
          name: domains.name,
          description: domains.description,
          status: domains.status,
          maxUsers: domains.maxUsers,
          userCount: sql<number>`CAST(COUNT(DISTINCT ${users.id}) AS INTEGER)`,
          createdAt: domains.createdAt,
          updatedAt: domains.updatedAt,
        })
        .from(domains)
        .leftJoin(users, eq(domains.id, users.domainId))
        .where(eq(domains.status, status))
        .groupBy(domains.id)
        .orderBy(desc(domains.createdAt))
        .limit(limit)
        .offset(offset);
    }

    const results = await query;

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
    const { name, description, status, maxUsers } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Name is required and must be a non-empty string',
          code: 'INVALID_NAME'
        },
        { status: 400 }
      );
    }

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { 
          error: 'Status is required',
          code: 'MISSING_STATUS'
        },
        { status: 400 }
      );
    }

    // Validate status value
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return NextResponse.json(
        { 
          error: 'Status must be one of: active, inactive, suspended',
          code: 'INVALID_STATUS_VALUE'
        },
        { status: 400 }
      );
    }

    // Validate maxUsers if provided
    if (maxUsers !== undefined && maxUsers !== null) {
      if (typeof maxUsers !== 'number' || maxUsers <= 0 || !Number.isInteger(maxUsers)) {
        return NextResponse.json(
          { 
            error: 'maxUsers must be a positive integer',
            code: 'INVALID_MAX_USERS'
          },
          { status: 400 }
        );
      }
    }

    // Trim name
    const trimmedName = name.trim();

    // Check if domain name already exists
    const existingDomain = await db
      .select()
      .from(domains)
      .where(eq(domains.name, trimmedName))
      .limit(1);

    if (existingDomain.length > 0) {
      return NextResponse.json(
        { 
          error: 'A domain with this name already exists',
          code: 'DUPLICATE_DOMAIN_NAME'
        },
        { status: 400 }
      );
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: {
      name: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      description?: string;
      maxUsers?: number;
    } = {
      name: trimmedName,
      status,
      createdAt: now,
      updatedAt: now,
    };

    if (description !== undefined && description !== null) {
      insertData.description = typeof description === 'string' ? description : String(description);
    }

    if (maxUsers !== undefined && maxUsers !== null) {
      insertData.maxUsers = maxUsers;
    }

    // Insert domain
    const newDomain = await db
      .insert(domains)
      .values(insertData)
      .returning();

    if (newDomain.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to create domain',
          code: 'CREATION_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(newDomain[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}