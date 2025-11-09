import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, payments, invoices, users } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Find client with displayId CLT#000006
    const client = await db.select()
      .from(users)
      .where(eq(users.displayId, 'CLT#000006'))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({ 
        error: 'Client CLT#000006 not found',
        code: 'CLIENT_NOT_FOUND' 
      }, { status: 404 });
    }

    // Find freelancer with displayId FRL#000007
    const freelancer = await db.select()
      .from(users)
      .where(eq(users.displayId, 'FRL#000007'))
      .limit(1);

    if (freelancer.length === 0) {
      return NextResponse.json({ 
        error: 'Freelancer FRL#000007 not found',
        code: 'FREELANCER_NOT_FOUND' 
      }, { status: 404 });
    }

    const clientId = client[0].id;
    const freelancerId = freelancer[0].id;

    // Find all test orders matching criteria
    const testJobs = await db.select()
      .from(jobs)
      .where(
        and(
          like(jobs.title, 'Test Order%'),
          eq(jobs.clientId, clientId),
          eq(jobs.assignedFreelancerId, freelancerId)
        )
      )
      .limit(10);

    if (testJobs.length === 0) {
      return NextResponse.json({ 
        error: 'No test orders found matching criteria',
        code: 'NO_JOBS_FOUND' 
      }, { status: 404 });
    }

    const jobIds = testJobs.map(job => job.id);
    const now = new Date();
    const currentTimestamp = now.toISOString();

    // Helper function to generate recent timestamp (5-50 minutes ago)
    const getRecentTimestamp = () => {
      const minutesAgo = Math.floor(Math.random() * 45) + 5; // 5-50 minutes
      const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);
      return timestamp.toISOString();
    };

    let updatedJobsCount = 0;
    let updatedPaymentsCount = 0;
    let updatedInvoicesCount = 0;

    // Update each job
    for (const job of testJobs) {
      await db.update(jobs)
        .set({
          status: 'delivered',
          paymentConfirmed: 0,
          updatedAt: currentTimestamp,
          createdAt: getRecentTimestamp()
        })
        .where(eq(jobs.id, job.id));
      
      updatedJobsCount++;
    }

    // Update payments for these jobs
    for (const jobId of jobIds) {
      const jobPayments = await db.select()
        .from(payments)
        .where(eq(payments.jobId, jobId));

      for (const payment of jobPayments) {
        await db.update(payments)
          .set({
            status: 'pending',
            confirmedByAdmin: 0,
            confirmedAt: null,
            updatedAt: currentTimestamp
          })
          .where(eq(payments.id, payment.id));
        
        updatedPaymentsCount++;
      }
    }

    // Update invoices for these jobs
    for (const jobId of jobIds) {
      const jobInvoices = await db.select()
        .from(invoices)
        .where(eq(invoices.jobId, jobId));

      for (const invoice of jobInvoices) {
        await db.update(invoices)
          .set({
            status: 'pending',
            isPaid: 0,
            paidAt: null,
            updatedAt: currentTimestamp
          })
          .where(eq(invoices.id, invoice.id));
        
        updatedInvoicesCount++;
      }
    }

    // Get updated jobs with key fields for sample
    const updatedJobs = await db.select({
      id: jobs.id,
      displayId: jobs.displayId,
      title: jobs.title,
      status: jobs.status,
      paymentConfirmed: jobs.paymentConfirmed,
      amount: jobs.amount,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt
    })
      .from(jobs)
      .where(
        and(
          like(jobs.title, 'Test Order%'),
          eq(jobs.clientId, clientId),
          eq(jobs.assignedFreelancerId, freelancerId)
        )
      )
      .limit(10);

    return NextResponse.json({
      success: true,
      updatedJobs: updatedJobsCount,
      updatedPayments: updatedPaymentsCount,
      updatedInvoices: updatedInvoicesCount,
      jobIds: jobIds,
      sample: updatedJobs.slice(0, 3),
      message: `Successfully reverted ${updatedJobsCount} test orders to unpaid status`
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}