import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

    // Fetch user
    const user = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user[0];

    return NextResponse.json(userWithoutPassword, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

    // Check if user exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, phone, email } = body;

    // Build update object with only provided fields
    const updates: any = {};

    // Validate name if provided
    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (trimmedName === '') {
        return NextResponse.json(
          { 
            error: 'Name must be a non-empty string',
            code: 'INVALID_NAME' 
          },
          { status: 400 }
        );
      }
      updates.name = trimmedName;
    }

    // Validate phone if provided
    if (phone !== undefined) {
      const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
      if (trimmedPhone === '') {
        return NextResponse.json(
          { 
            error: 'Phone must be a non-empty string',
            code: 'INVALID_PHONE' 
          },
          { status: 400 }
        );
      }
      updates.phone = trimmedPhone;
    }

    // Validate email if provided
    if (email !== undefined) {
      const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(trimmedEmail)) {
        return NextResponse.json(
          { 
            error: 'Invalid email format',
            code: 'INVALID_EMAIL' 
          },
          { status: 400 }
        );
      }

      // Check if email is different from current email
      if (trimmedEmail !== existingUser[0].email) {
        // Check if email is already used by another user
        const emailExists = await db.select()
          .from(users)
          .where(and(
            eq(users.email, trimmedEmail),
            ne(users.id, userId)
          ))
          .limit(1);

        if (emailExists.length > 0) {
          return NextResponse.json(
            { 
              error: 'Email is already in use by another user',
              code: 'EMAIL_IN_USE' 
            },
            { status: 400 }
          );
        }
      }

      updates.email = trimmedEmail;
    }

    // Add updatedAt timestamp
    updates.updatedAt = new Date().toISOString();

    // Update user in database
    const updatedUser = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser[0];

    return NextResponse.json(userWithoutPassword, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}