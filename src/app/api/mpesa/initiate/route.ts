import { NextRequest, NextResponse } from 'next/server';
import { initiateSTKPush, MpesaConfig } from '@/lib/mpesa';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, amount, paymentId, jobTitle } = body;

    console.log('M-Pesa initiate request:', { phoneNumber, amount, paymentId, jobTitle });

    // Validate required fields
    if (!phoneNumber || !amount || !paymentId) {
      console.error('Missing required fields:', { phoneNumber: !!phoneNumber, amount: !!amount, paymentId: !!paymentId });
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumber, amount, or paymentId' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^(07|01)\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      console.error('Invalid phone number format:', phoneNumber);
      return NextResponse.json(
        { error: 'Invalid phone number format. Use 07XXXXXXXX or 01XXXXXXXX' },
        { status: 400 }
      );
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      console.error('Invalid amount:', amount);
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Get M-Pesa configuration
    const config: MpesaConfig = {
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
      businessShortCode: process.env.MPESA_SHORTCODE || '174379',
      passkey: process.env.MPESA_PASSKEY || '',
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tasklynk.co.ke'}/api/mpesa/callback`,
      environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    };

    console.log('M-Pesa config:', {
      hasConsumerKey: !!config.consumerKey,
      hasConsumerSecret: !!config.consumerSecret,
      hasPasskey: !!config.passkey,
      businessShortCode: config.businessShortCode,
      environment: config.environment,
      callbackUrl: config.callbackUrl,
    });

    // Validate configuration
    if (!config.consumerKey || !config.consumerSecret || !config.passkey) {
      console.error('M-Pesa configuration incomplete:', {
        hasConsumerKey: !!config.consumerKey,
        hasConsumerSecret: !!config.consumerSecret,
        hasPasskey: !!config.passkey,
      });
      return NextResponse.json(
        { error: 'M-Pesa configuration incomplete. Please contact support.' },
        { status: 500 }
      );
    }

    // Verify payment record exists
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, parseInt(paymentId)))
      .limit(1);

    if (!existingPayment) {
      console.error('Payment record not found:', paymentId);
      return NextResponse.json(
        { error: 'Payment record not found. Please try again.' },
        { status: 404 }
      );
    }

    console.log('Payment record found:', {
      id: existingPayment.id,
      amount: existingPayment.amount,
      status: existingPayment.status,
    });

    // Initiate STK Push
    console.log('Initiating STK Push...');
    const stkResponse = await initiateSTKPush(config, {
      phoneNumber,
      amount: numAmount,
      accountReference: `TL-${paymentId}`,
      transactionDesc: `Payment for ${jobTitle || 'TaskLynk Order'}`,
    });

    console.log('STK Push response:', stkResponse);

    // Update payment record with checkout request IDs
    await db
      .update(payments)
      .set({
        mpesaCheckoutRequestId: stkResponse.CheckoutRequestID,
        mpesaMerchantRequestId: stkResponse.MerchantRequestID,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, parseInt(paymentId)));

    console.log('Payment record updated with STK Push IDs');

    return NextResponse.json({
      success: true,
      message: stkResponse.CustomerMessage || 'STK Push sent to your phone. Please enter your PIN.',
      checkoutRequestId: stkResponse.CheckoutRequestID,
      merchantRequestId: stkResponse.MerchantRequestID,
    });
  } catch (error: any) {
    console.error('M-Pesa STK Push error:', error);
    console.error('Error stack:', error.stack);
    
    // Extract user-friendly error message
    let errorMessage = 'Failed to initiate payment. Please try again.';
    
    if (error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. Please check your internet connection and try again.';
    } else if (error.message?.includes('token')) {
      errorMessage = 'M-Pesa authentication failed. Please contact support.';
    } else if (error.message?.includes('network')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}