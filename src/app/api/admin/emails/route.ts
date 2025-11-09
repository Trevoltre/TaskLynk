import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emailLogs, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate query parameters
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const recipientType = searchParams.get('recipientType');
    const fromEmail = searchParams.get('fromEmail');
    const status = searchParams.get('status');

    // Validate page and limit
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ 
        error: 'Page must be a positive integer',
        code: 'INVALID_PAGE'
      }, { status: 400 });
    }

    if (isNaN(limit) || limit < 1) {
      return NextResponse.json({ 
        error: 'Limit must be a positive integer',
        code: 'INVALID_LIMIT'
      }, { status: 400 });
    }

    // Validate recipientType if provided
    const validRecipientTypes = ['individual', 'freelancers', 'clients', 'all_users'];
    if (recipientType && !validRecipientTypes.includes(recipientType)) {
      return NextResponse.json({ 
        error: 'Invalid recipientType. Must be one of: individual, freelancers, clients, all_users',
        code: 'INVALID_RECIPIENT_TYPE'
      }, { status: 400 });
    }

    // Validate status if provided
    const validStatuses = ['sent', 'failed', 'partial'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: sent, failed, partial',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build query with LEFT JOIN to users table
    let query = db
      .select({
        id: emailLogs.id,
        sentBy: emailLogs.sentBy,
        senderId: users.id,
        senderName: users.name,
        senderEmail: users.email,
        sentTo: emailLogs.sentTo,
        recipientType: emailLogs.recipientType,
        recipientCount: emailLogs.recipientCount,
        fromEmail: emailLogs.fromEmail,
        subject: emailLogs.subject,
        status: emailLogs.status,
        jobId: emailLogs.jobId,
        createdAt: emailLogs.createdAt,
      })
      .from(emailLogs)
      .leftJoin(users, eq(emailLogs.sentBy, users.id));

    // Build filter conditions
    const conditions = [];

    if (recipientType) {
      conditions.push(eq(emailLogs.recipientType, recipientType));
    }

    if (fromEmail) {
      conditions.push(eq(emailLogs.fromEmail, fromEmail.toLowerCase().trim()));
    }

    if (status) {
      conditions.push(eq(emailLogs.status, status));
    }

    // Apply filters if any exist
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order by createdAt DESC (newest first) and apply pagination
    const results = await query
      .orderBy(desc(emailLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Transform results to match response format
    const formattedResults = results.map(row => ({
      id: row.id,
      sentBy: row.sentBy,
      senderName: row.senderName ?? null,
      senderEmail: row.senderEmail ?? null,
      sentTo: row.sentTo,
      recipientType: row.recipientType,
      recipientCount: row.recipientCount,
      fromEmail: row.fromEmail,
      subject: row.subject,
      status: row.status,
      jobId: row.jobId,
      createdAt: row.createdAt,
    }));

    return NextResponse.json(formattedResults, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}