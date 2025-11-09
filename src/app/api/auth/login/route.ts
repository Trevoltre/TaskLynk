import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('[Login] Attempting login for:', email);
    console.log('[Login] Password provided length:', password.length);

    // Find user by email
    let user;
    try {
      const results = await db.select().from(users).where(eq(users.email, email)).limit(1);
      user = results[0];
      console.log('[Login] User found:', user ? 'Yes' : 'No');
      if (user) {
        console.log('[Login] User details:', {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          hasPassword: !!user.password,
          passwordLength: user.password?.length,
          passwordPrefix: user.password?.substring(0, 10)
        });
      }
    } catch (dbError: any) {
      console.error('[Login] Database error:', dbError);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is rejected
    if (user.rejectedAt) {
      return NextResponse.json(
        { error: 'Your account has been rejected. Please contact support.' },
        { status: 403 }
      );
    }

    // Check if user is blacklisted
    if (user.status === 'blacklisted') {
      return NextResponse.json(
        { error: `Your account has been blacklisted. Reason: ${user.blacklistReason || 'Not specified'}` },
        { status: 403 }
      );
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      const suspendedUntil = user.suspendedUntil ? new Date(user.suspendedUntil) : null;
      if (suspendedUntil && suspendedUntil > new Date()) {
        return NextResponse.json(
          { error: `Your account is suspended until ${suspendedUntil.toLocaleDateString()}. Reason: ${user.suspensionReason || 'Not specified'}` },
          { status: 403 }
        );
      } else if (!suspendedUntil) {
        return NextResponse.json(
          { error: `Your account is suspended. Reason: ${user.suspensionReason || 'Not specified'}` },
          { status: 403 }
        );
      } else {
        // Suspension has expired, update status to active
        await db.update(users).set({ 
          status: 'active', 
          suspendedUntil: null,
          suspensionReason: null 
        }).where(eq(users.id, user.id));
        user.status = 'active';
      }
    }

    // Verify password
    console.log('[Login] Verifying password...');
    console.log('[Login] Comparing:', { providedPassword: password, storedHashPrefix: user.password?.substring(0, 20) });
    
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('[Login] Password valid:', isPasswordValid);
      
      // Additional debug: try comparing with the provided password hashed again
      if (!isPasswordValid) {
        console.log('[Login] Password comparison failed, checking hash format...');
        const testHash = await bcrypt.hash(password, 10);
        console.log('[Login] Test hash created:', testHash.substring(0, 20));
        console.log('[Login] Stored hash:', user.password.substring(0, 20));
        console.log('[Login] Hash format looks correct:', user.password.startsWith('$2'));
      }
    } catch (bcryptError: any) {
      console.error('[Login] Bcrypt error:', bcryptError);
      return NextResponse.json(
        { error: 'Password verification error' },
        { status: 500 }
      );
    }

    if (!isPasswordValid) {
      console.log('[Login] Password verification FAILED');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('[Login] Password verification SUCCESSFUL');

    // Update last login information
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'Unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    try {
      await db.update(users).set({
        lastLoginAt: new Date().toISOString(),
        lastLoginIp: clientIp,
        lastLoginDevice: userAgent,
        loginCount: (user.loginCount || 0) + 1,
      }).where(eq(users.id, user.id));
      console.log('[Login] Updated login metadata');
    } catch (updateError: any) {
      console.error('[Login] Failed to update login metadata:', updateError);
      // Non-critical, continue with login
    }

    // Return user data (including approved status)
    const { password: _, ...userWithoutPassword } = user;
    console.log('[Login] Login successful');
    return NextResponse.json({
      ...userWithoutPassword,
      loginCount: (user.loginCount || 0) + 1,
    });
  } catch (error: any) {
    console.error('[Login] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}