import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pendingRegistrations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, getEmailVerificationHTML } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validation: Check email is provided
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Email is required',
          code: 'EMAIL_REQUIRED' 
        },
        { status: 400 }
      );
    }

    // Validation: Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { 
          error: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT' 
        },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Find pending registration by email
    const pendingResult = await db.select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, normalizedEmail))
      .limit(1);

    if (pendingResult.length === 0) {
      return NextResponse.json(
        { 
          error: 'No pending registration found for this email',
          code: 'NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const pending = pendingResult[0];

    // Generate new 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculate expiration (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Update pending registration with new code
    await db.update(pendingRegistrations)
      .set({
        verificationCode: code,
        codeExpiresAt: expiresAt
      })
      .where(eq(pendingRegistrations.email, normalizedEmail));

    // Send verification email using branded template
    await sendEmail({
      to: normalizedEmail,
      subject: 'Verify Your Email - TaskLynk Academic',
      html: getEmailVerificationHTML(pending.name, code)
    });

    return NextResponse.json(
      {
        success: true,
        expiresAt: expiresAt,
        message: 'Verification code sent successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}