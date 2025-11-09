import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, jobs, payments, invoices } from '@/db/schema';
import { eq, and, like, desc } from 'drizzle-orm';

const BATCH_TAG = 'seed-test-orders-ksh20-frl7-clt6';
const CLIENT_DISPLAY_ID = 'CLT#000006';
const FREELANCER_DISPLAY_ID = 'FRL#000007';
const TARGET_ORDER_COUNT = 10;

function generateMpesaCode(): string {
  return 'TEST' + Math.floor(10000000 + Math.random() * 90000000).toString();
}

function generateInvoiceNumber(): string {
  return 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

async function getNextJobDisplayId(): Promise<string> {
  const latestJob = await db.select()
    .from(jobs)
    .orderBy(desc(jobs.id))
    .limit(1);

  if (latestJob.length === 0) {
    return 'JOB#000001';
  }

  const latestDisplayId = latestJob[0].displayId;
  const numberMatch = latestDisplayId.match(/\d+/);
  
  if (!numberMatch) {
    return 'JOB#000001';
  }

  const nextNumber = parseInt(numberMatch[0]) + 1;
  return `JOB#${nextNumber.toString().padStart(6, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    // Security check: only allow in development or with explicit flag
    const isDevelopment = process.env.NODE_ENV === 'development';
    const allowTestSeeds = process.env.ALLOW_TEST_SEEDS === 'true';

    if (!isDevelopment && !allowTestSeeds) {
      return NextResponse.json(
        { 
          error: 'Test seeding is only allowed in development or with ALLOW_TEST_SEEDS=true',
          code: 'FORBIDDEN'
        },
        { status: 403 }
      );
    }

    // Find client
    const client = await db.select()
      .from(users)
      .where(eq(users.displayId, CLIENT_DISPLAY_ID))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json(
        { 
          error: `Client with displayId ${CLIENT_DISPLAY_ID} not found`,
          code: 'CLIENT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Find freelancer
    const freelancer = await db.select()
      .from(users)
      .where(eq(users.displayId, FREELANCER_DISPLAY_ID))
      .limit(1);

    if (freelancer.length === 0) {
      return NextResponse.json(
        { 
          error: `Freelancer with displayId ${FREELANCER_DISPLAY_ID} not found`,
          code: 'FREELANCER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const clientRecord = client[0];
    const freelancerRecord = freelancer[0];

    // Check existing test orders
    const existingTestOrders = await db.select()
      .from(jobs)
      .where(
        and(
          like(jobs.title, 'Test Order%'),
          eq(jobs.clientId, clientRecord.id),
          eq(jobs.assignedFreelancerId, freelancerRecord.id)
        )
      );

    const existingCount = existingTestOrders.length;

    // If we already have 10 or more test orders, return existing
    if (existingCount >= TARGET_ORDER_COUNT) {
      // Query back with full details
      const testOrdersWithDetails = await Promise.all(
        existingTestOrders.slice(0, TARGET_ORDER_COUNT).map(async (job) => {
          const [clientData] = await db.select({
            id: users.id,
            displayId: users.displayId,
            name: users.name
          }).from(users).where(eq(users.id, job.clientId));

          const [freelancerData] = await db.select({
            id: users.id,
            displayId: users.displayId,
            name: users.name
          }).from(users).where(eq(users.id, job.assignedFreelancerId!));

          const [payment] = await db.select().from(payments).where(eq(payments.jobId, job.id));
          const [invoice] = await db.select().from(invoices).where(eq(invoices.jobId, job.id));

          return {
            ...job,
            client: clientData,
            freelancer: freelancerData,
            payment: payment || null,
            invoice: invoice || null
          };
        })
      );

      return NextResponse.json({
        success: true,
        message: 'Test orders already exist',
        created: 0,
        total: existingCount,
        batchTag: BATCH_TAG,
        client: {
          id: clientRecord.id,
          displayId: clientRecord.displayId,
          name: clientRecord.name
        },
        freelancer: {
          id: freelancerRecord.id,
          displayId: freelancerRecord.displayId,
          name: freelancerRecord.name
        },
        jobs: testOrdersWithDetails
      });
    }

    // Calculate how many more we need
    const ordersToCreate = TARGET_ORDER_COUNT - existingCount;
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Create new test orders
    const createdJobs = [];
    for (let i = 1; i <= ordersToCreate; i++) {
      const orderNumber = existingCount + i;
      const displayId = await getNextJobDisplayId();
      
      // Calculate createdAt: NOW minus (10 - orderNumber) days
      const daysAgo = TARGET_ORDER_COUNT - orderNumber;
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Create job
      const [newJob] = await db.insert(jobs).values({
        displayId: displayId,
        clientId: clientRecord.id,
        assignedFreelancerId: freelancerRecord.id,
        title: `Test Order ${orderNumber}`,
        instructions: `Test order for payment testing - Order ${orderNumber}`,
        workType: 'Essay',
        amount: 20,
        status: 'delivered',
        adminApproved: true,
        clientApproved: false,
        paymentConfirmed: true,
        requestDraft: false,
        draftDelivered: false,
        revisionRequested: false,
        deadline: twoDaysFromNow.toISOString(),
        actualDeadline: twoDaysFromNow.toISOString(),
        freelancerDeadline: oneDayFromNow.toISOString(),
        placementPriority: 0,
        urgencyMultiplier: 1.0,
        createdAt: createdAt.toISOString(),
        updatedAt: now.toISOString()
      }).returning();

      // Create payment
      const [newPayment] = await db.insert(payments).values({
        jobId: newJob.id,
        clientId: clientRecord.id,
        freelancerId: freelancerRecord.id,
        amount: 20,
        paymentMethod: 'mpesa',
        status: 'confirmed',
        confirmedByAdmin: true,
        confirmedAt: now.toISOString(),
        mpesaCode: generateMpesaCode(),
        createdAt: createdAt.toISOString(),
        updatedAt: now.toISOString()
      }).returning();

      // Create invoice
      const [newInvoice] = await db.insert(invoices).values({
        jobId: newJob.id,
        clientId: clientRecord.id,
        freelancerId: freelancerRecord.id,
        invoiceNumber: generateInvoiceNumber(),
        amount: 20,
        freelancerAmount: 12,
        adminCommission: 8,
        description: `Invoice for Test Order ${orderNumber}`,
        status: 'paid',
        isPaid: true,
        paidAt: now.toISOString(),
        createdAt: createdAt.toISOString(),
        updatedAt: now.toISOString()
      }).returning();

      createdJobs.push({
        ...newJob,
        client: {
          id: clientRecord.id,
          displayId: clientRecord.displayId,
          name: clientRecord.name
        },
        freelancer: {
          id: freelancerRecord.id,
          displayId: freelancerRecord.displayId,
          name: freelancerRecord.name
        },
        payment: newPayment,
        invoice: newInvoice
      });
    }

    // Query back all test orders (existing + new)
    const allTestOrders = await db.select()
      .from(jobs)
      .where(
        and(
          like(jobs.title, 'Test Order%'),
          eq(jobs.clientId, clientRecord.id),
          eq(jobs.assignedFreelancerId, freelancerRecord.id)
        )
      );

    const allTestOrdersWithDetails = await Promise.all(
      allTestOrders.map(async (job) => {
        const [clientData] = await db.select({
          id: users.id,
          displayId: users.displayId,
          name: users.name
        }).from(users).where(eq(users.id, job.clientId));

        const [freelancerData] = await db.select({
          id: users.id,
          displayId: users.displayId,
          name: users.name
        }).from(users).where(eq(users.id, job.assignedFreelancerId!));

        const [payment] = await db.select().from(payments).where(eq(payments.jobId, job.id));
        const [invoice] = await db.select().from(invoices).where(eq(invoices.jobId, job.id));

        return {
          id: job.id,
          displayId: job.displayId,
          title: job.title,
          clientId: job.clientId,
          freelancerId: job.assignedFreelancerId,
          amount: job.amount,
          status: job.status,
          paymentConfirmed: job.paymentConfirmed,
          client: clientData,
          freelancer: freelancerData,
          payment: payment || null,
          invoice: invoice || null
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: `Created ${ordersToCreate} new test order${ordersToCreate !== 1 ? 's' : ''}`,
      created: ordersToCreate,
      total: allTestOrders.length,
      batchTag: BATCH_TAG,
      client: {
        id: clientRecord.id,
        displayId: clientRecord.displayId,
        name: clientRecord.name
      },
      freelancer: {
        id: freelancerRecord.id,
        displayId: freelancerRecord.displayId,
        name: freelancerRecord.name
      },
      jobs: allTestOrdersWithDetails
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}