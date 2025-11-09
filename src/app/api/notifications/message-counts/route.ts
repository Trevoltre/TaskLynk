import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobMessages, jobs } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      );
    }

    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // For admin: count messages from clients and freelancers separately
    if (role === 'admin') {
      // Get all jobs with their client and freelancer info
      const allJobs = await db
        .select({
          jobId: jobs.id,
          clientId: jobs.clientId,
          freelancerId: jobs.assignedFreelancerId,
        })
        .from(jobs);

      // Get all unapproved messages
      const unapprovedMessages = await db
        .select({
          jobId: jobMessages.jobId,
          senderId: jobMessages.senderId,
        })
        .from(jobMessages)
        .where(eq(jobMessages.adminApproved, false));

      // Count messages from clients and freelancers
      let clientMessages = 0;
      let freelancerMessages = 0;

      for (const msg of unapprovedMessages) {
        const job = allJobs.find(j => j.jobId === msg.jobId);
        if (job) {
          if (msg.senderId === job.clientId) {
            clientMessages++;
          } else if (job.freelancerId && msg.senderId === job.freelancerId) {
            freelancerMessages++;
          }
        }
      }

      return NextResponse.json({
        clientMessages,
        freelancerMessages,
        totalMessages: clientMessages + freelancerMessages,
      });
    }

    // For client: count all approved messages from freelancers in their jobs
    if (role === 'client') {
      const clientJobs = await db
        .select({ jobId: jobs.id })
        .from(jobs)
        .where(eq(jobs.clientId, parsedUserId));

      const jobIds = clientJobs.map(j => j.jobId);

      if (jobIds.length === 0) {
        return NextResponse.json({ unreadMessages: 0 });
      }

      // Count approved messages not sent by the client
      const allMessages = await db
        .select()
        .from(jobMessages)
        .where(
          and(
            eq(jobMessages.adminApproved, true),
            sql`${jobMessages.jobId} IN ${sql.raw(`(${jobIds.join(',')})`)}`
          )
        );

      const unreadMessages = allMessages.filter(msg => msg.senderId !== parsedUserId).length;

      return NextResponse.json({ unreadMessages });
    }

    // For freelancer: count all approved messages from clients in their assigned jobs
    if (role === 'freelancer') {
      const freelancerJobs = await db
        .select({ jobId: jobs.id })
        .from(jobs)
        .where(eq(jobs.assignedFreelancerId, parsedUserId));

      const jobIds = freelancerJobs.map(j => j.jobId);

      if (jobIds.length === 0) {
        return NextResponse.json({ unreadMessages: 0 });
      }

      // Count approved messages not sent by the freelancer
      const allMessages = await db
        .select()
        .from(jobMessages)
        .where(
          and(
            eq(jobMessages.adminApproved, true),
            sql`${jobMessages.jobId} IN ${sql.raw(`(${jobIds.join(',')})`)}`
          )
        );

      const unreadMessages = allMessages.filter(msg => msg.senderId !== parsedUserId).length;

      return NextResponse.json({ unreadMessages });
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}