import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emailLogs, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const emailLogId = parseInt(id);

    // Query emailLogs with LEFT JOIN to users table
    const result = await db
      .select({
        id: emailLogs.id,
        sentBy: emailLogs.sentBy,
        senderName: users.name,
        senderEmail: users.email,
        sentTo: emailLogs.sentTo,
        recipientType: emailLogs.recipientType,
        recipientCount: emailLogs.recipientCount,
        fromEmail: emailLogs.fromEmail,
        subject: emailLogs.subject,
        body: emailLogs.body,
        status: emailLogs.status,
        failedRecipients: emailLogs.failedRecipients,
        jobId: emailLogs.jobId,
        createdAt: emailLogs.createdAt,
      })
      .from(emailLogs)
      .leftJoin(users, eq(emailLogs.sentBy, users.id))
      .where(eq(emailLogs.id, emailLogId))
      .limit(1);

    // Check if email log exists
    if (result.length === 0) {
      return NextResponse.json({ 
        error: 'Email log not found',
        code: 'EMAIL_LOG_NOT_FOUND' 
      }, { status: 404 });
    }

    const emailLog = result[0];

    // Parse failedRecipients JSON string to array if present
    let parsedFailedRecipients: string[] | null = null;
    if (emailLog.failedRecipients) {
      try {
        parsedFailedRecipients = JSON.parse(emailLog.failedRecipients);
      } catch (error) {
        console.error('Failed to parse failedRecipients JSON:', error);
        parsedFailedRecipients = null;
      }
    }

    // Return full email log details with sender information
    return NextResponse.json({
      id: emailLog.id,
      sentBy: emailLog.sentBy,
      senderName: emailLog.senderName,
      senderEmail: emailLog.senderEmail,
      sentTo: emailLog.sentTo,
      recipientType: emailLog.recipientType,
      recipientCount: emailLog.recipientCount,
      fromEmail: emailLog.fromEmail,
      subject: emailLog.subject,
      body: emailLog.body,
      status: emailLog.status,
      failedRecipients: parsedFailedRecipients,
      jobId: emailLog.jobId,
      createdAt: emailLog.createdAt,
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}