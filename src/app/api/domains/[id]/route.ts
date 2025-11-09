import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { domains, users } from '@/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        },
        { status: 400 }
      );
    }

    const domainId = parseInt(id);

    // Query domain by id
    const domain = await db.select()
      .from(domains)
      .where(eq(domains.id, domainId))
      .limit(1);

    if (domain.length === 0) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Query all users where domainId matches, excluding password
    const domainUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role
    })
      .from(users)
      .where(eq(users.domainId, domainId));

    return NextResponse.json({
      domain: domain[0],
      users: domainUsers
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        },
        { status: 400 }
      );
    }

    const domainId = parseInt(id);

    // Check domain exists
    const existingDomain = await db.select()
      .from(domains)
      .where(eq(domains.id, domainId))
      .limit(1);

    if (existingDomain.length === 0) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, status, maxUsers } = body;

    // Validate name if provided
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return NextResponse.json(
          { 
            error: "Name cannot be empty",
            code: "INVALID_NAME" 
          },
          { status: 400 }
        );
      }

      // Check name uniqueness (excluding current domain)
      const duplicateName = await db.select()
        .from(domains)
        .where(and(
          eq(domains.name, trimmedName),
          ne(domains.id, domainId)
        ))
        .limit(1);

      if (duplicateName.length > 0) {
        return NextResponse.json(
          { 
            error: "Domain name already exists",
            code: "DUPLICATE_NAME" 
          },
          { status: 400 }
        );
      }
    }

    // Validate status if provided
    if (status !== undefined) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { 
            error: "Status must be one of: active, inactive, suspended",
            code: "INVALID_STATUS" 
          },
          { status: 400 }
        );
      }
    }

    // Validate maxUsers if provided
    if (maxUsers !== undefined && maxUsers !== null) {
      if (typeof maxUsers !== 'number' || maxUsers <= 0 || !Number.isInteger(maxUsers)) {
        return NextResponse.json(
          { 
            error: "maxUsers must be a positive integer",
            code: "INVALID_MAX_USERS" 
          },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) {
      updates.name = name.trim();
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (status !== undefined) {
      updates.status = status;
    }
    if (maxUsers !== undefined) {
      updates.maxUsers = maxUsers;
    }

    // Update domain
    const updated = await db.update(domains)
      .set(updates)
      .where(eq(domains.id, domainId))
      .returning();

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        },
        { status: 400 }
      );
    }

    const domainId = parseInt(id);

    // Check domain exists
    const existingDomain = await db.select()
      .from(domains)
      .where(eq(domains.id, domainId))
      .limit(1);

    if (existingDomain.length === 0) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Count users assigned to this domain
    const userCount = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.domainId, domainId));

    const count = Number(userCount[0].count);

    if (count > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete domain with assigned users. Please reassign or remove users first.",
          code: "DOMAIN_HAS_USERS",
          userCount: count
        },
        { status: 400 }
      );
    }

    // Delete domain
    const deleted = await db.delete(domains)
      .where(eq(domains.id, domainId))
      .returning();

    return NextResponse.json({
      message: 'Domain deleted successfully',
      domain: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}