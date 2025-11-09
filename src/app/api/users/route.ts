import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const role = searchParams.get('role');
    const approvedParam = searchParams.get('approved');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Build query
    let query = db.select({
      id: users.id,
      displayId: users.displayId,
      email: users.email,
      name: users.name,
      role: users.role,
      approved: users.approved,
      balance: users.balance,
      rating: users.rating,
      phone: users.phone,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users);

    // Build where conditions
    const conditions = [];

    // Apply role filter if provided - include account_owner support
    if (role && (role === 'admin' || role === 'client' || role === 'freelancer' || role === 'account_owner')) {
      conditions.push(eq(users.role, role));
    }

    // Apply approved filter if provided
    if (approvedParam !== null) {
      const approved = approvedParam === 'true';
      conditions.push(eq(users.approved, approved));
    }

    // Apply combined conditions
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    // Apply ordering and pagination
    const results = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}