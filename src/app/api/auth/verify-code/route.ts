import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pendingRegistrations, users } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { sendEmailToAdmins, getNewUserRegistrationAdminHTML } from '@/lib/email';
import { generateUserDisplayId } from '@/app/api/utils/generate-display-id/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    // Validation: Check email is provided
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Email is required',
          code: 'MISSING_EMAIL' 
        },
        { status: 400 }
      );
    }

    // Validation: Check code is provided
    if (!code || typeof code !== 'string' || code.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Verification code is required',
          code: 'MISSING_CODE' 
        },
        { status: 400 }
      );
    }

    // Validation: Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT' 
        },
        { status: 400 }
      );
    }

    // Normalize email and code
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    console.log('[Verify] Attempting verification for:', normalizedEmail);
    console.log('[Verify] Code provided:', normalizedCode);

    // Find pending registration
    const currentTimestamp = new Date().toISOString();
    const pendingResult = await db.select()
      .from(pendingRegistrations)
      .where(
        and(
          eq(pendingRegistrations.email, normalizedEmail),
          eq(pendingRegistrations.verificationCode, normalizedCode),
          gt(pendingRegistrations.codeExpiresAt, currentTimestamp)
        )
      )
      .limit(1);

    if (pendingResult.length === 0) {
      console.log('[Verify] No matching pending registration found');
      return NextResponse.json(
        { 
          error: 'Invalid or expired verification code',
          code: 'INVALID_CODE' 
        },
        { status: 400 }
      );
    }

    const pending = pendingResult[0];
    console.log('[Verify] Found pending registration:', {
      email: pending.email,
      role: pending.role,
      hasPassword: !!pending.password,
      passwordLength: pending.password?.length
    });

    // Check if user already exists in users table
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('[Verify] User already exists, cleaning up pending registration');
      // User already exists, just delete pending registration and return success
      await db.delete(pendingRegistrations)
        .where(eq(pendingRegistrations.email, normalizedEmail));
      
      return NextResponse.json(
        {
          success: true,
          message: 'Email already verified. You can now sign in.'
        },
        { status: 200 }
      );
    }

    // Generate display ID for the user
    const displayId = await generateUserDisplayId(pending.role);
    console.log('[Verify] Generated display ID:', displayId);

    // Insert user into database
    const newUser = await db.insert(users).values({
      displayId,
      email: normalizedEmail,
      password: pending.password,
      name: pending.name,
      role: pending.role,
      phone: pending.phone,
      approved: pending.role === 'admin',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    console.log('[Verify] User created successfully:', newUser[0].id);

    // Delete from pending registrations
    await db.delete(pendingRegistrations)
      .where(eq(pendingRegistrations.email, normalizedEmail));

    // Send notification to admins (don't wait for it)
    sendEmailToAdmins({
      subject: `New ${pending.role} Registration - ${pending.name}`,
      html: getNewUserRegistrationAdminHTML(
        pending.name,
        normalizedEmail,
        pending.role,
        pending.phone || 'Not provided'
      )
    }).catch(err => console.error('Failed to send admin notification:', err));

    return NextResponse.json({ 
      success: true,
      message: 'Email verified successfully! You can now log in.',
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        name: newUser[0].name,
        role: newUser[0].role
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}