import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, users, emailLogs } from '@/db/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { sendEmail, getDeadlineReminderEmailHTML } from '@/lib/email';

// Helper function to check authorization
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

// New: simple email that does NOT include exact time
function buildApproachingDeadlineEmail(recipientName: string, jobTitle: string, displayId?: string) {
  const safeName = recipientName || 'there';
  const ref = displayId ? ` (${displayId})` : '';
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif; line-height:1.6; color:#111;">
      <h2 style="margin:0 0 12px;">Deadline reminder</h2>
      <p>Hi ${safeName},</p>
      <p>The deadline for order <strong>${jobTitle}${ref}</strong> is approaching. Please take action to ensure it is completed on time.</p>
      <p style="margin-top:16px; color:#555; font-size:14px;">This is an automated reminder sent when an order reaches the 4-hour window to its deadline.</p>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const currentTime = new Date();
    const fourHoursFromNow = new Date(currentTime.getTime() + 14400000); // 4 hours in milliseconds
    const fourHoursFiveMinutesFromNow = new Date(currentTime.getTime() + 14700000); // 4 hours 5 minutes

    const currentTimeISO = currentTime.toISOString();
    const fourHoursFromNowISO = fourHoursFromNow.toISOString();
    const fourHoursFiveMinutesFromNowISO = fourHoursFiveMinutesFromNow.toISOString();

    // Find jobs with deadlines in the 5-minute window
    const eligibleJobs = await db.select()
      .from(jobs)
      .where(
        and(
          gte(jobs.actualDeadline, fourHoursFromNowISO),
          lte(jobs.actualDeadline, fourHoursFiveMinutesFromNowISO),
          or(
            eq(jobs.status, 'assigned'),
            eq(jobs.status, 'in_progress'),
            eq(jobs.status, 'pending')
          )
        )
      );

    if (eligibleJobs.length === 0) {
      return NextResponse.json({
        success: true,
        jobsProcessed: 0,
        emailsSent: 0,
        emailsFailed: 0,
        jobs: [],
        timestamp: currentTimeISO,
        message: 'No jobs with approaching deadlines found'
      });
    }

    // Get all admin users
    const adminUsers = await db.select()
      .from(users)
      .where(eq(users.role, 'admin'));

    let totalEmailsSent = 0;
    let totalEmailsFailed = 0;
    const jobResults = [];

    // Process each job
    for (const job of eligibleJobs) {
      const jobResult: any = {
        jobId: job.id,
        displayId: job.displayId,
        title: job.title,
        status: job.status,
        deadline: job.actualDeadline,
        emailsSent: 0,
        emailsFailed: 0,
        recipients: []
      };

      // Handle assigned/in_progress jobs
      if ((job.status === 'assigned' || job.status === 'in_progress') && job.assignedFreelancerId) {
        // Send to assigned freelancer
        try {
          const freelancer = await db.select()
            .from(users)
            .where(eq(users.id, job.assignedFreelancerId))
            .limit(1);

          if (freelancer.length > 0) {
            const freelancerEmail = freelancer[0].email;
            const freelancerName = freelancer[0].name;
            const subject = `Deadline Reminder: ${job.title}`;
            const emailHTML = buildApproachingDeadlineEmail(
              freelancerName,
              job.title,
              job.displayId
            );

            await sendEmail(freelancerEmail, subject, emailHTML);

            // Log the email
            await db.insert(emailLogs).values({
              sentBy: 1,
              sentTo: freelancerEmail,
              recipientType: 'freelancer',
              recipientCount: 1,
              fromEmail: 'admn@tasklynk.co.ke',
              subject,
              body: emailHTML,
              status: 'sent',
              jobId: job.id,
              createdAt: currentTimeISO
            });

            jobResult.emailsSent++;
            totalEmailsSent++;
            jobResult.recipients.push({ type: 'freelancer', email: freelancerEmail, status: 'sent' });
          }
        } catch (error) {
          console.error(`Failed to send email to freelancer for job ${job.id}:`, error);
          jobResult.emailsFailed++;
          totalEmailsFailed++;
          
          await db.insert(emailLogs).values({
            sentBy: 1,
            sentTo: 'freelancer',
            recipientType: 'freelancer',
            recipientCount: 1,
            fromEmail: 'admn@tasklynk.co.ke',
            subject: `Deadline Reminder: ${job.title}`,
            body: 'Failed to send',
            status: 'failed',
            failedRecipients: JSON.stringify([{ error: error instanceof Error ? error.message : 'Unknown error' }]),
            jobId: job.id,
            createdAt: currentTimeISO
          });
          
          jobResult.recipients.push({ type: 'freelancer', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
        }

        // Send to all admins for assigned jobs
        const adminEmailPromises = adminUsers.map(async (admin) => {
          try {
            const subject = `Deadline Reminder: ${job.title} (Assigned)`;
            const emailHTML = buildApproachingDeadlineEmail(
              admin.name,
              job.title,
              job.displayId
            );

            await sendEmail(admin.email, subject, emailHTML);
            return { success: true, email: admin.email };
          } catch (error) {
            console.error(`Failed to send email to admin ${admin.email} for job ${job.id}:`, error);
            return { success: false, email: admin.email, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        });

        const adminResults = await Promise.all(adminEmailPromises);
        const successfulAdminEmails = adminResults.filter(r => r.success);
        const failedAdminEmails = adminResults.filter(r => !r.success);

        if (successfulAdminEmails.length > 0) {
          await db.insert(emailLogs).values({
            sentBy: 1,
            sentTo: 'system_admins',
            recipientType: 'admin',
            recipientCount: successfulAdminEmails.length,
            fromEmail: 'admn@tasklynk.co.ke',
            subject: `Deadline Reminder: ${job.title} (Assigned)`,
            body: 'Batch email to admins',
            status: 'sent',
            jobId: job.id,
            createdAt: currentTimeISO
          });

          jobResult.emailsSent += successfulAdminEmails.length;
          totalEmailsSent += successfulAdminEmails.length;
          jobResult.recipients.push({ type: 'admin', count: successfulAdminEmails.length, status: 'sent' });
        }

        if (failedAdminEmails.length > 0) {
          await db.insert(emailLogs).values({
            sentBy: 1,
            sentTo: 'system_admins',
            recipientType: 'admin',
            recipientCount: failedAdminEmails.length,
            fromEmail: 'admn@tasklynk.co.ke',
            subject: `Deadline Reminder: ${job.title} (Assigned)`,
            body: 'Failed batch email to admins',
            status: 'failed',
            failedRecipients: JSON.stringify(failedAdminEmails.map(r => ({ email: r.email, error: r.error }))),
            jobId: job.id,
            createdAt: currentTimeISO
          });

          jobResult.emailsFailed += failedAdminEmails.length;
          totalEmailsFailed += failedAdminEmails.length;
          jobResult.recipients.push({ type: 'admin', count: failedAdminEmails.length, status: 'failed' });
        }
      }
      // Handle pending jobs (no assigned freelancer)
      else if (job.status === 'pending') {
        const message = `Unassigned order ${job.title} has a deadline approaching. Please assign a freelancer.`;
        
        const adminEmailPromises = adminUsers.map(async (admin) => {
          try {
            const subject = `URGENT: Unassigned Order Deadline Approaching - ${job.title}`;
            const emailHTML = buildApproachingDeadlineEmail(
              admin.name,
              job.title,
              job.displayId
            );

            await sendEmail(admin.email, subject, emailHTML);
            return { success: true, email: admin.email };
          } catch (error) {
            console.error(`Failed to send email to admin ${admin.email} for pending job ${job.id}:`, error);
            return { success: false, email: admin.email, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        });

        const adminResults = await Promise.all(adminEmailPromises);
        const successfulAdminEmails = adminResults.filter(r => r.success);
        const failedAdminEmails = adminResults.filter(r => !r.success);

        if (successfulAdminEmails.length > 0) {
          await db.insert(emailLogs).values({
            sentBy: 1,
            sentTo: 'system_admins',
            recipientType: 'system',
            recipientCount: successfulAdminEmails.length,
            fromEmail: 'admn@tasklynk.co.ke',
            subject: `URGENT: Unassigned Order Deadline Approaching - ${job.title}`,
            body: message,
            status: 'sent',
            jobId: job.id,
            createdAt: currentTimeISO
          });

          jobResult.emailsSent += successfulAdminEmails.length;
          totalEmailsSent += successfulAdminEmails.length;
          jobResult.recipients.push({ type: 'admin', count: successfulAdminEmails.length, status: 'sent' });
        }

        if (failedAdminEmails.length > 0) {
          await db.insert(emailLogs).values({
            sentBy: 1,
            sentTo: 'system_admins',
            recipientType: 'system',
            recipientCount: failedAdminEmails.length,
            fromEmail: 'admn@tasklynk.co.ke',
            subject: `URGENT: Unassigned Order Deadline Approaching - ${job.title}`,
            body: message,
            status: 'failed',
            failedRecipients: JSON.stringify(failedAdminEmails.map(r => ({ email: r.email, error: r.error }))),
            jobId: job.id,
            createdAt: currentTimeISO
          });

          jobResult.emailsFailed += failedAdminEmails.length;
          totalEmailsFailed += failedAdminEmails.length;
          jobResult.recipients.push({ type: 'admin', count: failedAdminEmails.length, status: 'failed' });
        }
      }

      jobResults.push(jobResult);
    }

    return NextResponse.json({
      success: true,
      jobsProcessed: eligibleJobs.length,
      emailsSent: totalEmailsSent,
      emailsFailed: totalEmailsFailed,
      jobs: jobResults,
      timestamp: currentTimeISO
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authorization via query parameter for manual testing
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Use the same logic as POST
    const currentTime = new Date();
    const fourHoursFromNow = new Date(currentTime.getTime() + 14400000);
    const fourHoursFiveMinutesFromNow = new Date(currentTime.getTime() + 14700000);

    const currentTimeISO = currentTime.toISOString();
    const fourHoursFromNowISO = fourHoursFromNow.toISOString();
    const fourHoursFiveMinutesFromNowISO = fourHoursFiveMinutesFromNow.toISOString();

    const eligibleJobs = await db.select()
      .from(jobs)
      .where(
        and(
          gte(jobs.actualDeadline, fourHoursFromNowISO),
          lte(jobs.actualDeadline, fourHoursFiveMinutesFromNowISO),
          or(
            eq(jobs.status, 'assigned'),
            eq(jobs.status, 'in_progress'),
            eq(jobs.status, 'pending')
          )
        )
      );

    if (eligibleJobs.length === 0) {
      return NextResponse.json({
        success: true,
        jobsProcessed: 0,
        emailsSent: 0,
        emailsFailed: 0,
        jobs: [],
        timestamp: currentTimeISO,
        message: 'No jobs with approaching deadlines found (manual test)'
      });
    }

    const adminUsers = await db.select()
      .from(users)
      .where(eq(users.role, 'admin'));

    let totalEmailsSent = 0;
    let totalEmailsFailed = 0;
    const jobResults = [];

    for (const job of eligibleJobs) {
      const jobResult: any = {
        jobId: job.id,
        displayId: job.displayId,
        title: job.title,
        status: job.status,
        deadline: job.actualDeadline,
        emailsSent: 0,
        emailsFailed: 0,
        recipients: []
      };

      if ((job.status === 'assigned' || job.status === 'in_progress') && job.assignedFreelancerId) {
        try {
          const freelancer = await db.select()
            .from(users)
            .where(eq(users.id, job.assignedFreelancerId))
            .limit(1);

          if (freelancer.length > 0) {
            const freelancerEmail = freelancer[0].email;
            const freelancerName = freelancer[0].name;
            const subject = `Deadline Reminder: ${job.title}`;
            const emailHTML = buildApproachingDeadlineEmail(
              freelancerName,
              job.title,
              job.displayId
            );

            await sendEmail(freelancerEmail, subject, emailHTML);

            await db.insert(emailLogs).values({
              sentBy: 1,
              sentTo: freelancerEmail,
              recipientType: 'freelancer',
              recipientCount: 1,
              fromEmail: 'admn@tasklynk.co.ke',
              subject,
              body: emailHTML,
              status: 'sent',
              jobId: job.id,
              createdAt: currentTimeISO
            });

            jobResult.emailsSent++;
            totalEmailsSent++;
            jobResult.recipients.push({ type: 'freelancer', email: freelancerEmail, status: 'sent' });
          }
        } catch (error) {
          console.error(`Failed to send email to freelancer for job ${job.id}:`, error);
          jobResult.emailsFailed++;
          totalEmailsFailed++;
          
          await db.insert(emailLogs).values({
            sentBy: 1,
            sentTo: 'freelancer',
            recipientType: 'freelancer',
            recipientCount: 1,
            fromEmail: 'admn@tasklynk.co.ke',
            subject: `Deadline Reminder: ${job.title}`,
            body: 'Failed to send',
            status: 'failed',
            failedRecipients: JSON.stringify([{ error: error instanceof Error ? error.message : 'Unknown error' }]),
            jobId: job.id,
            createdAt: currentTimeISO
          });
          
          jobResult.recipients.push({ type: 'freelancer', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
        }

        const adminEmailPromises = adminUsers.map(async (admin) => {
          try {
            const subject = `Deadline Reminder: ${job.title} (Assigned)`;
            const emailHTML = buildApproachingDeadlineEmail(
              admin.name,
              job.title,
              job.displayId
            );

            await sendEmail(admin.email, subject, emailHTML);
            return { success: true, email: admin.email };
          } catch (error) {
            console.error(`Failed to send email to admin ${admin.email} for job ${job.id}:`, error);
            return { success: false, email: admin.email, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        });

        const adminResults = await Promise.all(adminEmailPromises);
        const successfulAdminEmails = adminResults.filter(r => r.success);
        const failedAdminEmails = adminResults.filter(r => !r.success);

        if (successfulAdminEmails.length > 0) {
          await db.insert(emailLogs).values({
            sentBy: 1,
            sentTo: 'system_admins',
            recipientType: 'admin',
            recipientCount: successfulAdminEmails.length,
            fromEmail: 'admn@tasklynk.co.ke',
            subject: `Deadline Reminder: ${job.title} (Assigned)`,
            body: 'Batch email to admins',
            status: 'sent',
            jobId: job.id,
            createdAt: currentTimeISO
          });

          jobResult.emailsSent += successfulAdminEmails.length;
          totalEmailsSent += successfulAdminEmails.length;
          jobResult.recipients.push({ type: 'admin', count: successfulAdminEmails.length, status: 'sent' });
        }

        if (failedAdminEmails.length > 0) {
          await db.insert(emailLogs).values({
            sentBy: 1,
            sentTo: 'system_admins',
            recipientType: 'admin',
            recipientCount: failedAdminEmails.length,
            fromEmail: 'admn@tasklynk.co.ke',
            subject: `Deadline Reminder: ${job.title} (Assigned)`,
            body: 'Failed batch email to admins',
            status: 'failed',
            failedRecipients: JSON.stringify(failedAdminEmails.map(r => ({ email: r.email, error: r.error }))),
            jobId: job.id,
            createdAt: currentTimeISO
          });

          jobResult.emailsFailed += failedAdminEmails.length;
          totalEmailsFailed += failedAdminEmails.length;
          jobResult.recipients.push({ type: 'admin', count: failedAdminEmails.length, status: 'failed' });
        }
      } else if (job.status === 'pending') {
        const message = `Unassigned order ${job.title} has a deadline approaching. Please assign a freelancer.`;
        
        const adminEmailPromises = adminUsers.map(async (admin) => {
          try {
            const subject = `URGENT: Unassigned Order Deadline Approaching - ${job.title}`;
            const emailHTML = buildApproachingDeadlineEmail(
              admin.name,
              job.title,
              job.displayId
            );

            await sendEmail(admin.email, subject, emailHTML);
            return { success: true, email: admin.email };
          } catch (error) {
            console.error(`Failed to send email to admin ${admin.email} for pending job ${job.id}:`, error);
            return { success: false, email: admin.email, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        });

        const adminResults = await Promise.all(adminEmailPromises);
        const successfulAdminEmails = adminResults.filter(r => r.success);
        const failedAdminEmails = adminResults.filter(r => !r.success);

        if (successfulAdminEmails.length > 0) {
          await db.insert(emailLogs).values({
            sentBy: 1,
            sentTo: 'system_admins',
            recipientType: 'system',
            recipientCount: successfulAdminEmails.length,
            fromEmail: 'admn@tasklynk.co.ke',
            subject: `URGENT: Unassigned Order Deadline Approaching - ${job.title}`,
            body: message,
            status: 'sent',
            jobId: job.id,
            createdAt: currentTimeISO
          });

          jobResult.emailsSent += successfulAdminEmails.length;
          totalEmailsSent += successfulAdminEmails.length;
          jobResult.recipients.push({ type: 'admin', count: successfulAdminEmails.length, status: 'sent' });
        }

        if (failedAdminEmails.length > 0) {
          await db.insert(emailLogs).values({
            sentBy: 1,
            sentTo: 'system_admins',
            recipientType: 'system',
            recipientCount: failedAdminEmails.length,
            fromEmail: 'admn@tasklynk.co.ke',
            subject: `URGENT: Unassigned Order Deadline Approaching - ${job.title}`,
            body: message,
            status: 'failed',
            failedRecipients: JSON.stringify(failedAdminEmails.map(r => ({ email: r.email, error: r.error }))),
            jobId: job.id,
            createdAt: currentTimeISO
          });

          jobResult.emailsFailed += failedAdminEmails.length;
          totalEmailsFailed += failedAdminEmails.length;
          jobResult.recipients.push({ type: 'admin', count: failedAdminEmails.length, status: 'failed' });
        }
      }

      jobResults.push(jobResult);
    }

    return NextResponse.json({
      success: true,
      jobsProcessed: eligibleJobs.length,
      emailsSent: totalEmailsSent,
      emailsFailed: totalEmailsFailed,
      jobs: jobResults,
      timestamp: currentTimeISO,
      testMode: true
    });

  } catch (error) {
    console.error('GET cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}