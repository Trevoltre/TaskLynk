import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Count regular clients (including account_owner)
    const regularResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(users)
      .where(
        and(
          or(eq(users.role, 'client'), eq(users.role, 'account_owner')),
          eq(users.clientPriority, 'regular')
        )
      );

    const regularCount = regularResult[0]?.count ?? 0;

    // Count priority clients (including account_owner)
    const priorityResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(users)
      .where(
        and(
          or(eq(users.role, 'client'), eq(users.role, 'account_owner')),
          eq(users.clientPriority, 'priority')
        )
      );

    const priorityCount = priorityResult[0]?.count ?? 0;

    // Calculate total
    const total = regularCount + priorityCount;

    return NextResponse.json({
      regular: regularCount,
      priority: priorityCount,
      total: total,
    }, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}