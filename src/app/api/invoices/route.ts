import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, jobs, users, payments } from '@/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { calculateFreelancerEarnings, calculateAdminCommission } from '@/lib/freelancer-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const jobId = searchParams.get('jobId');
    const clientId = searchParams.get('clientId');
    const freelancerId = searchParams.get('freelancerId');
    const status = searchParams.get('status');
    const invoiceId = searchParams.get('id');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // If requesting single invoice by ID
    if (invoiceId) {
      const parsedInvoiceId = parseInt(invoiceId);
      if (isNaN(parsedInvoiceId)) {
        return NextResponse.json({ 
          error: 'Invalid invoice ID',
          code: 'INVALID_INVOICE_ID' 
        }, { status: 400 });
      }

      const [invoice] = await db.select()
        .from(invoices)
        .where(eq(invoices.id, parsedInvoiceId));

      if (!invoice) {
        return NextResponse.json({ 
          error: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(invoice, { status: 200 });
    }

    // Build where conditions for filtering
    const conditions = [];
    
    if (jobId) {
      const parsedJobId = parseInt(jobId);
      if (isNaN(parsedJobId)) {
        return NextResponse.json({ 
          error: 'Invalid jobId parameter',
          code: 'INVALID_JOB_ID' 
        }, { status: 400 });
      }
      conditions.push(eq(invoices.jobId, parsedJobId));
    }

    if (clientId) {
      const parsedClientId = parseInt(clientId);
      if (isNaN(parsedClientId)) {
        return NextResponse.json({ 
          error: 'Invalid clientId parameter',
          code: 'INVALID_CLIENT_ID' 
        }, { status: 400 });
      }
      conditions.push(eq(invoices.clientId, parsedClientId));
    }

    if (freelancerId) {
      const parsedFreelancerId = parseInt(freelancerId);
      if (isNaN(parsedFreelancerId)) {
        return NextResponse.json({ 
          error: 'Invalid freelancerId parameter',
          code: 'INVALID_FREELANCER_ID' 
        }, { status: 400 });
      }
      conditions.push(eq(invoices.freelancerId, parsedFreelancerId));
    }

    if (status) {
      if (!['pending', 'paid', 'cancelled'].includes(status)) {
        return NextResponse.json({ 
          error: 'Invalid status. Must be: pending, paid, or cancelled',
          code: 'INVALID_STATUS' 
        }, { status: 400 });
      }
      conditions.push(eq(invoices.status, status));
    }

    let query = db.select().from(invoices);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // NEW: Support generating invoice by paymentId (auto-compute all values)
    if (body?.paymentId !== undefined && body?.paymentId !== null) {
      const paymentId = parseInt(body.paymentId);
      if (isNaN(paymentId)) {
        return NextResponse.json({
          error: 'paymentId must be a valid integer',
          code: 'INVALID_PAYMENT_ID'
        }, { status: 400 });
      }

      // Fetch payment
      const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
      if (!payment) {
        return NextResponse.json({
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        }, { status: 404 });
      }

      // Fetch job
      const [job] = await db.select().from(jobs).where(eq(jobs.id, payment.jobId));
      if (!job) {
        return NextResponse.json({
          error: 'Job not found for payment',
          code: 'JOB_NOT_FOUND'
        }, { status: 404 });
      }

      // Fetch client and freelancer
      const [client] = await db.select().from(users).where(eq(users.id, payment.clientId));
      const freelancerId = payment.freelancerId ?? job.assignedFreelancerId ?? null;
      const [freelancer] = freelancerId ? await db.select().from(users).where(eq(users.id, freelancerId)) : [null as any];

      const amount = Number(payment.amount);
      const freelancerAmount = calculateFreelancerEarnings(amount);
      const adminCommission = calculateAdminCommission(amount);

      // Generate invoice number
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayInvoices = await db.select().from(invoices).where(gte(invoices.createdAt, startOfDay));
      const sequenceNum = (todayInvoices.length + 1).toString().padStart(5, '0');
      const invoiceNumber = `INV-${dateStr}-${sequenceNum}`;
      const timestamp = now.toISOString();

      // Idempotency: return existing invoice if already created for this job/client/amount
      const existing = await db.select().from(invoices).where(
        and(
          eq(invoices.jobId, job.id),
          eq(invoices.clientId, client.id),
          eq(invoices.amount, amount)
        )
      );

      let createdInvoice = existing[0];
      if (!createdInvoice) {
        const [inserted] = await db.insert(invoices).values({
          jobId: job.id,
          clientId: client.id,
          freelancerId: freelancerId ?? null,
          invoiceNumber,
          amount,
          freelancerAmount,
          adminCommission,
          description: `${job.title} • ${job.workType}`,
          status: payment.status === 'confirmed' ? 'paid' : 'pending',
          isPaid: payment.status === 'confirmed',
          paidAt: payment.status === 'confirmed' ? (payment.confirmedAt ?? timestamp) : null,
          createdAt: timestamp,
          updatedAt: timestamp,
        }).returning();
        createdInvoice = inserted;
      }

      // Build the shape expected by InvoiceGenerator
      const responsePayload = {
        invoiceNumber: createdInvoice.invoiceNumber,
        invoiceDate: createdInvoice.createdAt,
        payment: {
          id: payment.id,
          amount: amount,
          mpesaCode: payment.mpesaCode ?? null,
          status: payment.status,
          createdAt: payment.createdAt,
        },
        job: {
          title: job.title,
          workType: job.workType,
          pages: job.pages ?? null,
          slides: job.slides ?? null,
        },
        client: {
          name: client?.name ?? 'Client',
          email: client?.email ?? '',
          phone: client?.phone ?? '',
        },
        freelancer: {
          name: freelancer?.name ?? 'Freelancer',
          email: freelancer?.email ?? '',
          phone: freelancer?.phone ?? '',
        },
        subtotal: amount,
        tax: 0,
        total: amount,
      };

      return NextResponse.json(responsePayload, { status: 201 });
    }

    const { jobId, clientId, freelancerId, amount, description } = body;

    // Validate jobId
    if (!jobId) {
      return NextResponse.json({ 
        error: 'jobId is required',
        code: 'MISSING_JOB_ID' 
      }, { status: 400 });
    }

    const parsedJobId = parseInt(jobId);
    if (isNaN(parsedJobId)) {
      return NextResponse.json({ 
        error: 'jobId must be a valid integer',
        code: 'INVALID_JOB_ID' 
      }, { status: 400 });
    }

    // Validate clientId
    if (!clientId) {
      return NextResponse.json({ 
        error: 'clientId is required',
        code: 'MISSING_CLIENT_ID' 
      }, { status: 400 });
    }

    const parsedClientId = parseInt(clientId);
    if (isNaN(parsedClientId)) {
      return NextResponse.json({ 
        error: 'clientId must be a valid integer',
        code: 'INVALID_CLIENT_ID' 
      }, { status: 400 });
    }

    // Validate amount
    if (!amount) {
      return NextResponse.json({ 
        error: 'amount is required',
        code: 'MISSING_AMOUNT' 
      }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ 
        error: 'amount must be a positive number',
        code: 'INVALID_AMOUNT' 
      }, { status: 400 });
    }

    // Validate description
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json({ 
        error: 'description is required and must be a non-empty string',
        code: 'INVALID_DESCRIPTION' 
      }, { status: 400 });
    }

    // Validate optional freelancerId
    let parsedFreelancerId = null;
    if (freelancerId !== undefined && freelancerId !== null) {
      parsedFreelancerId = parseInt(freelancerId);
      if (isNaN(parsedFreelancerId)) {
        return NextResponse.json({ 
          error: 'freelancerId must be a valid integer',
          code: 'INVALID_FREELANCER_ID' 
        }, { status: 400 });
      }
    }

    // Verify job exists
    const [job] = await db.select().from(jobs).where(eq(jobs.id, parsedJobId));
    if (!job) {
      return NextResponse.json({ 
        error: 'Job not found',
        code: 'JOB_NOT_FOUND' 
      }, { status: 404 });
    }

    // Verify client exists
    const [client] = await db.select().from(users).where(eq(users.id, parsedClientId));
    if (!client) {
      return NextResponse.json({ 
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND' 
      }, { status: 404 });
    }

    // Verify freelancer exists if provided
    if (parsedFreelancerId) {
      const [freelancer] = await db.select().from(users).where(eq(users.id, parsedFreelancerId));
      if (!freelancer) {
        return NextResponse.json({ 
          error: 'Freelancer not found',
          code: 'FREELANCER_NOT_FOUND' 
        }, { status: 404 });
      }
    }

    // Calculate 70/30 split
    const freelancerAmount = calculateFreelancerEarnings(parsedAmount);
    const adminCommission = calculateAdminCommission(parsedAmount);

    // Generate invoice number: INV-YYYYMMDD-XXXXX
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    
    // Get the count of invoices created today to generate sequence number
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayInvoices = await db.select().from(invoices)
      .where(gte(invoices.createdAt, startOfDay));
    
    const sequenceNum = (todayInvoices.length + 1).toString().padStart(5, '0');
    const invoiceNumber = `INV-${dateStr}-${sequenceNum}`;

    const timestamp = now.toISOString();

    // Insert new invoice with 70/30 split
    const insertData: any = {
      jobId: parsedJobId,
      clientId: parsedClientId,
      invoiceNumber,
      amount: parsedAmount,
      freelancerAmount: freelancerAmount,
      adminCommission: adminCommission,
      description: description.trim(),
      status: 'pending',
      isPaid: false,
      paidAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (parsedFreelancerId !== null) {
      insertData.freelancerId = parsedFreelancerId;
    }

    const newInvoice = await db.insert(invoices)
      .values(insertData)
      .returning();

    return NextResponse.json(newInvoice[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}