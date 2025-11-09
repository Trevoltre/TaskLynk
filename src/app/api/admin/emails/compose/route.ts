import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emailLogs, users } from '@/db/schema';
import { eq, and, inArray, gte, sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';

const ALLOWED_FROM_EMAILS = [
  'admn@tasklynk.co.ke'
];

const ALLOWED_RECIPIENT_TYPES = [
  'individual',
  'freelancers',
  'clients',
  'all_users'
];

// Resend Free Tier: 100 emails/day limit
const DAILY_EMAIL_LIMIT = 100;

interface EmailRecipient {
  id: number;
  email: string;
  name: string;
  role: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sentBy,
      fromEmail,
      recipientType,
      recipientIds,
      subject,
      body: emailBody,
      jobId
    } = body;

    // Validate required fields
    if (!sentBy || typeof sentBy !== 'number') {
      return NextResponse.json({
        error: 'sentBy is required and must be a valid user ID',
        code: 'MISSING_SENT_BY'
      }, { status: 400 });
    }

    if (!fromEmail || typeof fromEmail !== 'string') {
      return NextResponse.json({
        error: 'fromEmail is required',
        code: 'MISSING_FROM_EMAIL'
      }, { status: 400 });
    }

    if (!ALLOWED_FROM_EMAILS.includes(fromEmail)) {
      return NextResponse.json({
        error: `fromEmail must be one of: ${ALLOWED_FROM_EMAILS.join(', ')}`,
        code: 'INVALID_FROM_EMAIL'
      }, { status: 400 });
    }

    if (!recipientType || typeof recipientType !== 'string') {
      return NextResponse.json({
        error: 'recipientType is required',
        code: 'MISSING_RECIPIENT_TYPE'
      }, { status: 400 });
    }

    if (!ALLOWED_RECIPIENT_TYPES.includes(recipientType)) {
      return NextResponse.json({
        error: `recipientType must be one of: ${ALLOWED_RECIPIENT_TYPES.join(', ')}`,
        code: 'INVALID_RECIPIENT_TYPE'
      }, { status: 400 });
    }

    if (recipientType === 'individual' && (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0)) {
      return NextResponse.json({
        error: 'recipientIds array is required when recipientType is "individual"',
        code: 'MISSING_RECIPIENT_IDS'
      }, { status: 400 });
    }

    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return NextResponse.json({
        error: 'subject is required and must be a non-empty string',
        code: 'MISSING_SUBJECT'
      }, { status: 400 });
    }

    if (!emailBody || typeof emailBody !== 'string' || emailBody.trim() === '') {
      return NextResponse.json({
        error: 'body is required and must be a non-empty HTML string',
        code: 'MISSING_BODY'
      }, { status: 400 });
    }

    if (jobId !== undefined && jobId !== null && typeof jobId !== 'number') {
      return NextResponse.json({
        error: 'jobId must be a valid integer if provided',
        code: 'INVALID_JOB_ID'
      }, { status: 400 });
    }

    // Verify sentBy user exists and has admin role
    const adminUser = await db.select()
      .from(users)
      .where(eq(users.id, sentBy))
      .limit(1);

    if (adminUser.length === 0) {
      return NextResponse.json({
        error: 'User specified in sentBy not found',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    if (adminUser[0].role !== 'admin') {
      return NextResponse.json({
        error: 'Only admin users can send bulk emails',
        code: 'FORBIDDEN_NOT_ADMIN'
      }, { status: 403 });
    }

    // Get recipient list based on recipientType
    let recipients: EmailRecipient[] = [];
    let sentToString = '';

    if (recipientType === 'individual') {
      const individualUsers = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role
      })
        .from(users)
        .where(
          and(
            inArray(users.id, recipientIds),
            eq(users.approved, true)
          )
        );

      recipients = individualUsers;
      sentToString = individualUsers.map(u => u.email).join(', ');

      if (recipients.length === 0) {
        return NextResponse.json({
          error: 'No approved users found with the provided recipient IDs',
          code: 'NO_RECIPIENTS_FOUND'
        }, { status: 400 });
      }
    } else if (recipientType === 'freelancers') {
      const freelancerUsers = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role
      })
        .from(users)
        .where(
          and(
            eq(users.role, 'freelancer'),
            eq(users.approved, true)
          )
        );

      recipients = freelancerUsers;
      sentToString = 'all_freelancers';

      if (recipients.length === 0) {
        return NextResponse.json({
          error: 'No approved freelancers found',
          code: 'NO_FREELANCERS_FOUND'
        }, { status: 400 });
      }
    } else if (recipientType === 'clients') {
      const clientUsers = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role
      })
        .from(users)
        .where(
          and(
            eq(users.role, 'client'),
            eq(users.approved, true)
          )
        );

      recipients = clientUsers;
      sentToString = 'all_clients';

      if (recipients.length === 0) {
        return NextResponse.json({
          error: 'No approved clients found',
          code: 'NO_CLIENTS_FOUND'
        }, { status: 400 });
      }
    } else if (recipientType === 'all_users') {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role
      })
        .from(users)
        .where(eq(users.approved, true));

      recipients = allUsers;
      sentToString = 'all_users';

      if (recipients.length === 0) {
        return NextResponse.json({
          error: 'No approved users found',
          code: 'NO_USERS_FOUND'
        }, { status: 400 });
      }
    }

    // Check daily email limit (Resend Free Tier: 100 emails/day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const emailsSentToday = await db.select({
      totalSent: sql<number>`COALESCE(SUM(${emailLogs.recipientCount}), 0)`
    })
      .from(emailLogs)
      .where(gte(emailLogs.createdAt, todayStart.toISOString()));

    const currentDailyCount = Number(emailsSentToday[0]?.totalSent || 0);
    const remainingQuota = DAILY_EMAIL_LIMIT - currentDailyCount;

    if (recipients.length > remainingQuota) {
      return NextResponse.json({
        error: `Daily email limit exceeded. You can send ${remainingQuota} more emails today (${currentDailyCount}/${DAILY_EMAIL_LIMIT} used). Resend Free Tier allows 100 emails/day.`,
        code: 'DAILY_LIMIT_EXCEEDED',
        data: {
          limit: DAILY_EMAIL_LIMIT,
          used: currentDailyCount,
          remaining: remainingQuota,
          requested: recipients.length
        }
      }, { status: 429 });
    }

    // Send emails to all recipients
    const failedRecipients: { email: string; name: string; error: string }[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        await sendEmail({
          to: recipient.email,
          from: fromEmail,
          subject: subject.trim(),
          html: emailBody.trim()
        });
        successCount++;
      } catch (error) {
        failedCount++;
        failedRecipients.push({
          email: recipient.email,
          name: recipient.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`Failed to send email to ${recipient.email}:`, error);
      }
    }

    // Determine status
    let status: 'sent' | 'failed' | 'partial';
    if (failedCount === 0) {
      status = 'sent';
    } else if (successCount === 0) {
      status = 'failed';
    } else {
      status = 'partial';
    }

    // Insert email log
    const emailLogData: any = {
      sentBy,
      sentTo: sentToString,
      recipientType,
      recipientCount: recipients.length,
      fromEmail,
      subject: subject.trim(),
      body: emailBody.trim(),
      status,
      failedRecipients: failedRecipients.length > 0 ? JSON.stringify(failedRecipients) : null,
      jobId: jobId || null,
      createdAt: new Date().toISOString()
    };

    const newEmailLog = await db.insert(emailLogs)
      .values(emailLogData)
      .returning();

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failedCount,
      total: recipients.length,
      emailLogId: newEmailLog[0].id,
      status,
      dailyUsage: {
        used: currentDailyCount + successCount,
        limit: DAILY_EMAIL_LIMIT,
        remaining: DAILY_EMAIL_LIMIT - (currentDailyCount + successCount)
      }
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/emails/bulk error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}