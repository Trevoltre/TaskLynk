import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { domains, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const { id, userId } = params;

    // Validate id parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid domain ID is required',
          code: 'INVALID_DOMAIN_ID'
        },
        { status: 400 }
      );
    }

    // Validate userId parameter
    if (!userId || isNaN(parseInt(userId))) {
      return NextResponse.json(
        { 
          error: 'Valid user ID is required',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }

    const domainId = parseInt(id);
    const userIdInt = parseInt(userId);

    // Check if domain exists
    const domain = await db.select()
      .from(domains)
      .where(eq(domains.id, domainId))
      .limit(1);

    if (domain.length === 0) {
      return NextResponse.json(
        { 
          error: 'Domain not found',
          code: 'DOMAIN_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Check if user exists
    const user = await db.select()
      .from(users)
      .where(eq(users.id, userIdInt))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const userRecord = user[0];

    // Check if user is currently assigned to the specified domain
    if (userRecord.domainId !== domainId) {
      return NextResponse.json(
        { 
          error: 'User is not assigned to this domain',
          code: 'USER_NOT_IN_DOMAIN'
        },
        { status: 400 }
      );
    }

    // Remove user from domain
    const updatedUser = await db.update(users)
      .set({
        domainId: null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userIdInt))
      .returning();

    return NextResponse.json({
      message: 'User removed from domain successfully',
      user: {
        id: updatedUser[0].id,
        name: updatedUser[0].name,
        email: updatedUser[0].email
      }
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}