import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';

export async function GET() {
  try {
    // Check environment variables
    const hasUrl = !!process.env.TURSO_CONNECTION_URL;
    const hasToken = !!process.env.TURSO_AUTH_TOKEN;
    
    console.log('[DB Test] Environment check:', { hasUrl, hasToken });
    console.log('[DB Test] URL:', process.env.TURSO_CONNECTION_URL?.substring(0, 20) + '...');
    
    if (!hasUrl || !hasToken) {
      return NextResponse.json({ 
        error: 'Missing database credentials',
        hasUrl,
        hasToken
      }, { status: 500 });
    }

    // Try a simple query
    console.log('[DB Test] Attempting database query...');
    const result = await db.select().from(users).limit(1);
    console.log('[DB Test] Query successful, rows:', result.length);
    
    return NextResponse.json({ 
      success: true,
      message: 'Database connection working',
      userCount: result.length,
      hasUrl,
      hasToken
    });
  } catch (error: any) {
    console.error('[DB Test] Error:', error);
    return NextResponse.json({ 
      error: 'Database error',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
