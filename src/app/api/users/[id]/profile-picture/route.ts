import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate ID parameter
    const userId = parseInt(id);
    if (!id || isNaN(userId)) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { imageData } = body;

    // Validate imageData is provided
    if (!imageData) {
      return NextResponse.json(
        { 
          error: 'Image data is required',
          code: 'MISSING_IMAGE_DATA'
        },
        { status: 400 }
      );
    }

    // Validate imageData is a non-empty string after trimming
    if (typeof imageData !== 'string' || imageData.trim().length === 0) {
      return NextResponse.json(
        { 
          error: 'Image data cannot be empty',
          code: 'EMPTY_IMAGE_DATA'
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Update user's profile picture
    const updatedUser = await db.update(users)
      .set({
        profilePictureUrl: imageData.trim(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId))
      .returning();

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser[0] as any;

    return NextResponse.json(userWithoutPassword, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate ID parameter
    const userId = parseInt(id);
    if (!id || isNaN(userId)) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Query user by ID, selecting only id and profilePictureUrl
    const user = await db.select({
      id: users.id,
      profilePictureUrl: users.profilePictureUrl
    })
      .from(users)
      .where(eq(users.id, userId))
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

    return NextResponse.json(user[0], { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}