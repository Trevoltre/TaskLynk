import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    // Validate required fields
    if (!token || !newPassword) {
      return NextResponse.json(
        { 
          error: 'Token and new password are required',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate token is non-empty string
    if (typeof token !== 'string' || token.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Valid token is required',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate newPassword is non-empty string
    if (typeof newPassword !== 'string' || newPassword.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Valid new password is required',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { 
          error: 'Password must be at least 6 characters',
          code: 'PASSWORD_TOO_SHORT'
        },
        { status: 400 }
      );
    }

    // Hash the provided token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Query for the reset token
    const resetTokenResult = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, hashedToken))
      .limit(1);

    if (resetTokenResult.length === 0) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired reset token',
          code: 'TOKEN_NOT_FOUND'
        },
        { status: 400 }
      );
    }

    const resetToken = resetTokenResult[0];

    // Check if token is already used
    if (resetToken.used) {
      return NextResponse.json(
        { 
          error: 'This reset link has already been used',
          code: 'TOKEN_USED'
        },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expiresAt);
    
    if (now > expiresAt) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired reset token',
          code: 'INVALID_TOKEN'
        },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, resetToken.userId));

    // Mark the token as used
    await db
      .update(passwordResetTokens)
      .set({
        used: true
      })
      .where(eq(passwordResetTokens.id, resetToken.id));

    return NextResponse.json(
      {
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}