import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { domains, users } from '@/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid domain ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const domainId = parseInt(id);

    // Check if domain exists
    const domain = await db
      .select()
      .from(domains)
      .where(eq(domains.id, domainId))
      .limit(1);

    if (domain.length === 0) {
      return NextResponse.json(
        {
          error: 'Domain not found',
          code: 'DOMAIN_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userIds } = body;

    // Validate userIds is provided
    if (!userIds) {
      return NextResponse.json(
        {
          error: 'userIds is required',
          code: 'MISSING_USER_IDS',
        },
        { status: 400 }
      );
    }

    // Validate userIds is an array
    if (!Array.isArray(userIds)) {
      return NextResponse.json(
        {
          error: 'userIds must be an array',
          code: 'INVALID_USER_IDS_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate array has at least one element
    if (userIds.length === 0) {
      return NextResponse.json(
        {
          error: 'userIds array must contain at least one user ID',
          code: 'EMPTY_USER_IDS',
        },
        { status: 400 }
      );
    }

    // Validate all elements are valid integers
    const invalidElements = userIds.filter(
      (id) => typeof id !== 'number' || isNaN(id) || !Number.isInteger(id)
    );

    if (invalidElements.length > 0) {
      return NextResponse.json(
        {
          error: 'All userIds must be valid integers',
          code: 'INVALID_USER_ID_FORMAT',
          invalidElements,
        },
        { status: 400 }
      );
    }

    // Check if domain has maxUsers limit set
    const domainMaxUsers = domain[0].maxUsers;

    if (domainMaxUsers !== null && domainMaxUsers !== undefined) {
      // Get current user count for this domain
      const currentCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.domainId, domainId));

      const currentCount = Number(currentCountResult[0]?.count || 0);

      // Check if assigning these users would exceed maxUsers limit
      if (currentCount + userIds.length > domainMaxUsers) {
        return NextResponse.json(
          {
            error: `Cannot assign users. This would exceed the maximum user limit of ${domainMaxUsers} for this domain. Current: ${currentCount}, Attempting to add: ${userIds.length}`,
            code: 'MAX_USERS_EXCEEDED',
            details: {
              maxUsers: domainMaxUsers,
              currentCount,
              attemptingToAdd: userIds.length,
              wouldTotal: currentCount + userIds.length,
            },
          },
          { status: 400 }
        );
      }
    }

    // Verify all user IDs exist in users table
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, userIds));

    const existingUserIds = existingUsers.map((u) => u.id);
    const invalidUserIds = userIds.filter(
      (id) => !existingUserIds.includes(id)
    );

    if (invalidUserIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Some user IDs do not exist',
          code: 'INVALID_USER_IDS',
          invalidUserIds,
        },
        { status: 404 }
      );
    }

    // Update all specified users
    const updatedUsers = await db
      .update(users)
      .set({
        domainId: domainId,
        updatedAt: new Date().toISOString(),
      })
      .where(inArray(users.id, userIds))
      .returning();

    return NextResponse.json(
      {
        message: 'Users successfully assigned to domain',
        count: updatedUsers.length,
        userIds: updatedUsers.map((u) => u.id),
        domainId: domainId,
        domainName: domain[0].name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST assign-users error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}