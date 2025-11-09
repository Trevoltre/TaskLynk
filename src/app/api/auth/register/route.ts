import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pendingRegistrations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { sendEmail, getEmailVerificationHTML } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, phone } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({ 
        error: "Email is required",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ 
        error: "Password is required",
        code: "MISSING_PASSWORD" 
      }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ 
        error: "Role is required",
        code: "MISSING_ROLE" 
      }, { status: 400 });
    }

    // Validate phone number (now required)
    if (!phone || phone.trim() === '') {
      return NextResponse.json({ 
        error: "Phone number is required",
        code: "MISSING_PHONE" 
      }, { status: 400 });
    }

    // Enforce Kenyan phone number format: +2547XXXXXXXX / +2541XXXXXXXX / 07XXXXXXXX / 01XXXXXXXX
    const rawPhone = String(phone).trim().replace(/[\s-]/g, '');
    const kePhoneRegex = /^(?:\+254[17]\d{8}|0[17]\d{8})$/;
    if (!kePhoneRegex.test(rawPhone)) {
      return NextResponse.json({
        error: 'Invalid Kenyan phone number. Use formats like 0712345678 or +254712345678.',
        code: 'INVALID_PHONE'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL" 
      }, { status: 400 });
    }

    // Restrict to common consumer email domains only
    const allowedDomains = new Set([
      'gmail.com', 'googlemail.com',
      'yahoo.com', 'ymail.com', 'rocketmail.com',
      'hotmail.com', 'hotmail.co.uk', 'live.com', 'live.co.uk',
      'outlook.com', 'outlook.co.uk',
      'icloud.com', 'me.com'
    ]);
    const domain = String(email).toLowerCase().split('@')[1];
    if (!allowedDomains.has(domain)) {
      return NextResponse.json({
        error: 'Only popular email providers are allowed (e.g., gmail, yahoo, hotmail, outlook, icloud).',
        code: 'UNSUPPORTED_EMAIL_DOMAIN'
      }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ 
        error: "Password must be at least 6 characters long",
        code: "PASSWORD_TOO_SHORT" 
      }, { status: 400 });
    }

    // Validate role
    const validRoles = ['admin', 'client', 'freelancer', 'account_owner'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: "Role must be one of: admin, client, freelancer, account_owner",
        code: "INVALID_ROLE" 
      }, { status: 400 });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.trim().toLowerCase();

    // Check if pending registration already exists
    const existingPending = await db.select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, normalizedEmail))
      .limit(1);

    // Delete old pending registration if exists
    if (existingPending.length > 0) {
      await db.delete(pendingRegistrations)
        .where(eq(pendingRegistrations.email, normalizedEmail));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculate expiration (15 minutes from now)
    const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const timestamp = new Date().toISOString();

    // Store in pending registrations table
    await db.insert(pendingRegistrations).values({
      email: normalizedEmail,
      password: hashedPassword,
      name: name.trim(),
      role,
      phone: rawPhone,
      verificationCode,
      codeExpiresAt,
      createdAt: timestamp,
    });

    // Send verification email
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: 'Verify Your Email - TaskLynk Academic',
        html: getEmailVerificationHTML(name.trim(), verificationCode)
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the registration if email fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent to your email. Please verify to complete registration.',
      email: normalizedEmail
    }, { status: 200 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}