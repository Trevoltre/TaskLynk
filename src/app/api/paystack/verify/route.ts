import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, jobs, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// ✅ USE LIVE SECRET KEY from environment variable
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_live_c58ac969eafe329686b5290e26cfe6dda77990d4';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      reference, 
      jobId, 
      clientId, 
      freelancerId, 
      totalAmount,
      phoneNumber
    } = body;

    // Validate required fields
    if (!reference || !jobId || !clientId || !totalAmount) {
      console.error('Missing required fields:', { reference: !!reference, jobId: !!jobId, clientId: !!clientId, totalAmount: !!totalAmount });
      return NextResponse.json(
        { error: 'Missing required fields: reference, jobId, clientId, totalAmount' },
        { status: 400 }
      );
    }

    if (!PAYSTACK_SECRET_KEY) {
      console.error('Paystack secret key not configured');
      return NextResponse.json(
        { error: 'Paystack configuration missing' },
        { status: 500 }
      );
    }

    console.log('Verifying Paystack payment:', { reference, jobId, clientId, totalAmount });

    // Verify transaction with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('Paystack API error:', errorText);
      return NextResponse.json(
        { status: 'failed', message: 'Paystack verification request failed', error: errorText },
        { status: 500 }
      );
    }

    const verifyData = await verifyResponse.json();
    console.log('Paystack verification response:', JSON.stringify(verifyData, null, 2));

    // Check if payment was successful
    if (!verifyData.status || verifyData.data.status !== 'success') {
      console.error('Payment not successful:', verifyData);
      return NextResponse.json({
        status: 'failed',
        message: 'Payment verification failed - transaction not successful',
        data: verifyData,
      });
    }

    // Get amount from Paystack response (convert from kobo to KES)
    const paidAmount = verifyData.data.amount / 100;
    const now = new Date().toISOString();

    console.log('Payment verified successfully:', {
      reference,
      paidAmount,
      expectedAmount: totalAmount,
      difference: Math.abs(paidAmount - totalAmount)
    });

    // Check if payment amount matches (allow small difference for rounding)
    if (Math.abs(paidAmount - totalAmount) > 1) {
      console.error('Payment amount mismatch:', { paidAmount, expectedAmount: totalAmount });
      return NextResponse.json({
        status: 'failed',
        message: `Payment amount mismatch. Expected: ${totalAmount}, Received: ${paidAmount}`,
      });
    }

    // ✅ AUTO-APPROVE PAYMENT - Create payment record with confirmed status
    console.log('Creating auto-approved payment record...');
    
    const [payment] = await db.insert(payments).values({
      jobId: parseInt(jobId),
      clientId: parseInt(clientId),
      freelancerId: freelancerId ? parseInt(freelancerId) : null,
      amount: parseFloat(totalAmount.toString()),
      phoneNumber: phoneNumber || null,
      paystackReference: reference,
      mpesaCheckoutRequestId: reference, // Use same reference for consistency
      mpesaReceiptNumber: reference,
      paymentMethod: 'paystack',
      status: 'confirmed',
      confirmedByAdmin: true, // ✅ AUTO-APPROVE
      confirmedAt: now,
      createdAt: now,
      updatedAt: now,
    }).returning();

    console.log('Payment record created:', payment);

    // ✅ Update job payment status immediately
    await db
      .update(jobs)
      .set({
        paymentConfirmed: true,
        updatedAt: now,
      })
      .where(eq(jobs.id, parseInt(jobId)));

    console.log('Job payment status updated for job:', jobId);

    // ✅ Update freelancer balance if assigned
    if (freelancerId) {
      const [freelancer] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(freelancerId)));

      if (freelancer) {
        const newBalance = (freelancer.balance || 0) + parseFloat(totalAmount.toString());
        await db
          .update(users)
          .set({
            balance: newBalance,
            updatedAt: now,
          })
          .where(eq(users.id, parseInt(freelancerId)));

        console.log('Freelancer balance updated:', {
          freelancerId,
          oldBalance: freelancer.balance,
          newBalance,
          addedAmount: totalAmount
        });
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Payment verified and auto-approved successfully',
      data: {
        paymentId: payment.id,
        reference: reference,
        amount: totalAmount,
        paidAmount: paidAmount,
        phoneNumber: phoneNumber,
        autoApproved: true,
        channel: verifyData.data.channel,
        paidAt: verifyData.data.paid_at,
      },
    });

  } catch (error: any) {
    console.error('Paystack verification error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: error.message || 'Failed to verify payment',
        stack: error.stack
      },
      { status: 500 }
    );
  }
}