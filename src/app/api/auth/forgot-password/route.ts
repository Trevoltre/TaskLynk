import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { sendEmail, getPasswordResetEmailHTML } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    console.log('📧 [Forgot Password] Request received for email:', email);

    // Validate email is provided
    if (!email || typeof email !== 'string' || email.trim() === '') {
      console.log('❌ [Forgot Password] Missing email');
      return NextResponse.json(
        { 
          error: 'Email is required',
          code: 'MISSING_EMAIL'
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.log('❌ [Forgot Password] Invalid email format:', email);
      return NextResponse.json(
        { 
          error: 'Invalid email format',
          code: 'INVALID_EMAIL'
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log('🔍 [Forgot Password] Normalized email:', normalizedEmail);

    // Check if user exists
    const userResult = await db.select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // Security: Always return success message even if user doesn't exist
    if (userResult.length === 0) {
      console.log('⚠️ [Forgot Password] No user found with email:', normalizedEmail);
      return NextResponse.json(
        {
          success: true,
          message: 'If an account exists with that email, a password reset link has been sent.'
        },
        { status: 200 }
      );
    }

    const user = userResult[0];
    console.log('✅ [Forgot Password] User found:', { id: user.id, name: user.name, email: user.email });

    // Generate secure random token
    let token: string;
    let hashedToken: string;
    
    try {
      token = crypto.randomBytes(32).toString('hex');
      hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      console.log('🔑 [Forgot Password] Token generated successfully');
    } catch (error) {
      console.error('❌ [Forgot Password] Token generation error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to generate reset token',
          code: 'TOKEN_GENERATION_FAILED'
        },
        { status: 500 }
      );
    }

    // Mark any previous unused tokens for this user as used
    try {
      await db.update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.userId, user.id));
      console.log('🗑️ [Forgot Password] Previous tokens marked as used');
    } catch (error) {
      console.error('⚠️ [Forgot Password] Error marking old tokens as used:', error);
      // Continue anyway, this is not critical
    }

    // Create expiration time (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    // Store the hashed token
    try {
      await db.insert(passwordResetTokens)
        .values({
          userId: user.id,
          token: hashedToken,
          expiresAt,
          used: false,
          createdAt
        })
        .returning();
      console.log('💾 [Forgot Password] Token stored in database');
    } catch (error) {
      console.error('❌ [Forgot Password] Database error creating reset token:', error);
      return NextResponse.json(
        { 
          error: 'Internal server error: ' + (error as Error).message,
          code: 'INTERNAL_ERROR'
        },
        { status: 500 }
      );
    }

    // Prepare reset link pointing to tasklynk.co.ke
    const resetLink = `https://tasklynk.co.ke/reset-password?token=${token}`;
    console.log('🔗 [Forgot Password] Reset link generated:', resetLink);

    // Send password reset email using branded template
    try {
      console.log('📨 [Forgot Password] Attempting to send email to:', user.email);
      console.log('📨 [Forgot Password] From: TaskLynk <admn@tasklynk.co.ke>');
      console.log('📨 [Forgot Password] Subject: Reset Your TaskLynk Password');
      
      const emailResult = await sendEmail({
        to: user.email,
        subject: 'Reset Your TaskLynk Password',
        html: getPasswordResetEmailHTML(user.name, token),
      });
      
      if (emailResult.success) {
        console.log('✅ [Forgot Password] Email sent successfully to:', user.email);
        console.log('✅ [Forgot Password] Message ID:', emailResult.data?.messageId);
      } else {
        console.error('❌ [Forgot Password] Email sending failed:', emailResult.error);
        return NextResponse.json(
          { 
            error: 'Failed to send password reset email',
            code: 'EMAIL_SEND_FAILED',
            details: emailResult.error
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('❌ [Forgot Password] Email sending error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to send password reset email',
          code: 'EMAIL_SEND_FAILED',
          details: (error as Error).message
        },
        { status: 500 }
      );
    }

    console.log('🎉 [Forgot Password] Password reset process completed successfully for:', user.email);

    // Return success response (same message for security)
    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ [Forgot Password] POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error as Error).message,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}