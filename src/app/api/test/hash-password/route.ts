import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    // Validate password is provided and not empty
    if (!password || typeof password !== 'string' || password.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Password is required and cannot be empty',
          code: 'MISSING_PASSWORD'
        },
        { status: 400 }
      );
    }

    // Hash the password using bcrypt with 10 salt rounds
    const hashed = await bcrypt.hash(password, 10);

    // Return the hashed password
    return NextResponse.json(
      { hashed },
      { status: 200 }
    );

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Failed to hash password'),
        code: 'HASH_ERROR'
      },
      { status: 500 }
    );
  }
}