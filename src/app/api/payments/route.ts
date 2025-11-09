import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const jobId = searchParams.get('jobId');
    const clientId = searchParams.get('clientId');
    const freelancerId = searchParams.get('freelancerId');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    let query = db.select().from(payments);

    const conditions = [];
    
    if (jobId) {
      const parsedJobId = parseInt(jobId);
      if (isNaN(parsedJobId)) {
        return NextResponse.json({ 
          error: 'Invalid jobId parameter',
          code: 'INVALID_JOB_ID' 
        }, { status: 400 });
      }
      conditions.push(eq(payments.jobId, parsedJobId));
    }

    if (clientId) {
      const parsedClientId = parseInt(clientId);
      if (isNaN(parsedClientId)) {
        return NextResponse.json({ 
          error: 'Invalid clientId parameter',
          code: 'INVALID_CLIENT_ID' 
        }, { status: 400 });
      }
      conditions.push(eq(payments.clientId, parsedClientId));
    }

    if (freelancerId) {
      const parsedFreelancerId = parseInt(freelancerId);
      if (isNaN(parsedFreelancerId)) {
        return NextResponse.json({ 
          error: 'Invalid freelancerId parameter',
          code: 'INVALID_FREELANCER_ID' 
        }, { status: 400 });
      }
      conditions.push(eq(payments.freelancerId, parsedFreelancerId));
    }

    if (status) {
      if (!['pending', 'processing', 'confirmed', 'failed'].includes(status)) {
        return NextResponse.json({ 
          error: 'Invalid status. Must be: pending, processing, confirmed, or failed',
          code: 'INVALID_STATUS' 
        }, { status: 400 });
      }
      conditions.push(eq(payments.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(payments.createdAt))
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
    const { jobId, clientId, freelancerId, amount, mpesaCode, phoneNumber, paymentMethod } = body;

    if (!jobId) {
      return NextResponse.json({ 
        error: 'jobId is required',
        code: 'MISSING_JOB_ID' 
      }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ 
        error: 'clientId is required',
        code: 'MISSING_CLIENT_ID' 
      }, { status: 400 });
    }

    if (!freelancerId) {
      return NextResponse.json({ 
        error: 'freelancerId is required',
        code: 'MISSING_FREELANCER_ID' 
      }, { status: 400 });
    }

    if (!amount) {
      return NextResponse.json({ 
        error: 'amount is required',
        code: 'MISSING_AMOUNT' 
      }, { status: 400 });
    }

    // Validate paymentMethod
    if (!paymentMethod) {
      return NextResponse.json({ 
        error: 'paymentMethod is required',
        code: 'MISSING_PAYMENT_METHOD' 
      }, { status: 400 });
    }

    if (!['pochi', 'direct'].includes(paymentMethod)) {
      return NextResponse.json({ 
        error: 'paymentMethod must be either "pochi" or "direct"',
        code: 'INVALID_PAYMENT_METHOD' 
      }, { status: 400 });
    }

    const parsedJobId = parseInt(jobId);
    if (isNaN(parsedJobId)) {
      return NextResponse.json({ 
        error: 'jobId must be a valid number',
        code: 'INVALID_JOB_ID' 
      }, { status: 400 });
    }

    const parsedClientId = parseInt(clientId);
    if (isNaN(parsedClientId)) {
      return NextResponse.json({ 
        error: 'clientId must be a valid number',
        code: 'INVALID_CLIENT_ID' 
      }, { status: 400 });
    }

    const parsedFreelancerId = parseInt(freelancerId);
    if (isNaN(parsedFreelancerId)) {
      return NextResponse.json({ 
        error: 'freelancerId must be a valid number',
        code: 'INVALID_FREELANCER_ID' 
      }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ 
        error: 'amount must be a positive number',
        code: 'INVALID_AMOUNT' 
      }, { status: 400 });
    }

    // Validate payment method specific fields
    if (paymentMethod === 'pochi') {
      // Manual code entry - require mpesaCode
      if (!mpesaCode || typeof mpesaCode !== 'string' || mpesaCode.trim() === '') {
        return NextResponse.json({ 
          error: 'M-Pesa code is required for Pochi payment method',
          code: 'MISSING_MPESA_CODE' 
        }, { status: 400 });
      }
    } else if (paymentMethod === 'direct') {
      // Direct (Paystack/STK) - phone number helpful but not required
      // Payment details will be added later via Paystack callback
    }

    // Use ISO string for text timestamp fields
    const now = new Date().toISOString();

    // Determine initial status based on payment method
    const initialStatus = paymentMethod === 'pochi' ? 'pending' : 'processing';

    // Build insert data - Use ISO strings for text timestamp fields
    const insertData: {
      jobId: number;
      clientId: number;
      freelancerId: number | null;
      amount: number;
      status: string;
      paymentMethod: string;
      createdAt: string;
      updatedAt: string;
      mpesaCode?: string | null;
      phoneNumber?: string | null;
    } = {
      jobId: parsedJobId,
      clientId: parsedClientId,
      freelancerId: parsedFreelancerId,
      amount: parsedAmount,
      status: initialStatus,
      paymentMethod,
      createdAt: now,
      updatedAt: now,
    };

    // Add method-specific fields
    if (paymentMethod === 'pochi') {
      insertData.mpesaCode = mpesaCode.trim();
      if (phoneNumber && typeof phoneNumber === 'string' && phoneNumber.trim()) {
        insertData.phoneNumber = phoneNumber.trim();
      }
    } else if (paymentMethod === 'direct') {
      // Store phone number if provided (for mobile money)
      if (phoneNumber && typeof phoneNumber === 'string' && phoneNumber.trim()) {
        insertData.phoneNumber = phoneNumber.trim();
      }
      // Direct payment details (Paystack reference) will be added later via callback
    }

    const newPayment = await db.insert(payments)
      .values(insertData)
      .returning();

    return NextResponse.json({
      ...newPayment[0],
      paymentMethod
    }, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}