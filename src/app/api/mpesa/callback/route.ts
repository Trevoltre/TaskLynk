import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, jobs, users, notifications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, getPaymentConfirmedEmailHTML } from '@/lib/email';
import { calculateFreelancerAmount } from '@/lib/payment-calculations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('M-Pesa Callback received:', JSON.stringify(body, null, 2));

    const { Body } = body;
    const { stkCallback } = Body || {};

    if (!stkCallback) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback;

    // Find payment by CheckoutRequestID
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.mpesaCheckoutRequestId, CheckoutRequestID))
      .limit(1);

    if (!payment) {
      console.error('Payment not found for CheckoutRequestID:', CheckoutRequestID);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    const currentTimestamp = new Date().toISOString();

    // ResultCode 0 = Success, anything else = Failed
    if (ResultCode === 0) {
      // SUCCESSFUL PAYMENT - Auto-approve and complete order
      
      // Extract metadata
      const metadata = CallbackMetadata?.Item || [];
      const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = metadata.find((item: any) => item.Name === 'TransactionDate')?.Value;
      const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value;

      // Update payment to confirmed with auto-approval
      await db
        .update(payments)
        .set({
          status: 'confirmed',
          confirmedByAdmin: 1,
          mpesaReceiptNumber: mpesaReceiptNumber?.toString(),
          mpesaTransactionDate: transactionDate?.toString(),
          confirmedAt: currentTimestamp,
          updatedAt: currentTimestamp
        })
        .where(eq(payments.id, payment.id));

      // Get job details
      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, payment.jobId))
        .limit(1);

      if (!job) {
        console.error('Job not found for payment:', payment.id);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });
      }

      // Update job to completed and mark payment as confirmed
      await db
        .update(jobs)
        .set({
          status: 'completed',
          paymentConfirmed: 1,
          updatedAt: currentTimestamp
        })
        .where(eq(jobs.id, payment.jobId));

      // Update freelancer balance and send notification
      if (job.assignedFreelancerId) {
        const [freelancer] = await db
          .select()
          .from(users)
          .where(eq(users.id, job.assignedFreelancerId))
          .limit(1);

        if (freelancer) {
          // Calculate freelancer amount using centralized function - 70% of client payment
          const freelancerAmount = calculateFreelancerAmount(payment.amount);
          
          const newBalance = freelancer.balance + freelancerAmount;
          const newEarned = freelancer.earned + freelancerAmount;
          const newTotalEarnings = freelancer.totalEarnings + freelancerAmount;
          
          // Update freelancer balance and earnings
          await db
            .update(users)
            .set({
              balance: newBalance,
              earned: newEarned,
              totalEarnings: newTotalEarnings,
              completedJobs: freelancer.completedJobs + 1,
              updatedAt: currentTimestamp
            })
            .where(eq(users.id, job.assignedFreelancerId));

          // Create notification for freelancer
          await db.insert(notifications).values({
            userId: job.assignedFreelancerId,
            jobId: payment.jobId,
            type: 'payment_received',
            title: 'Payment Received!',
            message: `Payment confirmed! KES ${payment.amount.toFixed(2)} has been added to your balance.`,
            read: 0,
            createdAt: currentTimestamp
          });

          // Send email to freelancer
          try {
            await sendEmail({
              to: freelancer.email,
              subject: '💰 Payment Received on TaskLynk!',
              html: getPaymentConfirmedEmailHTML(
                freelancer.name,
                job.title,
                payment.amount,
                newBalance
              ),
            });
          } catch (emailError) {
            console.error('Failed to send email to freelancer:', emailError);
          }

          console.log('Freelancer balance updated:', {
            freelancerId: job.assignedFreelancerId,
            previousBalance: freelancer.balance,
            newBalance,
            amountAdded: payment.amount
          });
        }
      }

      // Send notification to client
      const [client] = await db
        .select()
        .from(users)
        .where(eq(users.id, payment.clientId))
        .limit(1);

      if (client) {
        // Create notification for client
        await db.insert(notifications).values({
          userId: payment.clientId,
          jobId: payment.jobId,
          type: 'order_completed',
          title: 'Payment Successful!',
          message: `Your payment was successful! Order #${job.displayId} is now complete.`,
          read: 0,
          createdAt: currentTimestamp
        });

        // Send email to client
        try {
          await sendEmail({
            to: client.email,
            subject: '✅ Payment Successful - Order Complete!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1D3557;">Payment Successful!</h2>
                <p>Hello ${client.name},</p>
                <p>Your M-Pesa payment of <strong>KES ${payment.amount.toFixed(2)}</strong> was successful!</p>
                <p><strong>M-Pesa Receipt Number:</strong> ${mpesaReceiptNumber}</p>
                <p>Your order <strong>#${job.displayId} - ${job.title}</strong> is now complete.</p>
                <p>Thank you for using TaskLynk!</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/orders/${job.id}" style="display: inline-block; background-color: #1D3557; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Order</a>
              </div>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send email to client:', emailError);
        }
      }

      console.log('Payment confirmed automatically:', {
        paymentId: payment.id,
        jobId: payment.jobId,
        mpesaReceiptNumber,
        transactionDate,
        phoneNumber
      });

    } else {
      // PAYMENT FAILED
      
      // Update payment to failed
      await db
        .update(payments)
        .set({
          status: 'failed',
          mpesaResultDesc: ResultDesc,
          updatedAt: currentTimestamp
        })
        .where(eq(payments.id, payment.id));

      // Send notification to client about failure
      const [client] = await db
        .select()
        .from(users)
        .where(eq(users.id, payment.clientId))
        .limit(1);

      if (client) {
        // Create notification for client
        await db.insert(notifications).values({
          userId: payment.clientId,
          jobId: payment.jobId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `M-Pesa payment failed. Please try again or use manual code entry (Lipa Pochi La Biashara).`,
          read: 0,
          createdAt: currentTimestamp
        });

        // Send email to client
        try {
          await sendEmail({
            to: client.email,
            subject: '❌ M-Pesa Payment Failed',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #D32F2F;">Payment Failed</h2>
                <p>Hello ${client.name},</p>
                <p>Your M-Pesa Direct Pay attempt failed.</p>
                <p><strong>Reason:</strong> ${ResultDesc}</p>
                <p>Please try one of these options:</p>
                <ul>
                  <li>Try M-Pesa Direct Pay again</li>
                  <li>Use Lipa Pochi La Biashara and enter the code manually</li>
                </ul>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/orders/${payment.jobId}/payment" style="display: inline-block; background-color: #1D3557; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Retry Payment</a>
              </div>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send email to client:', emailError);
        }
      }

      console.log('Payment failed:', {
        paymentId: payment.id,
        resultCode: ResultCode,
        resultDesc: ResultDesc
      });
    }

    // Always respond with success to M-Pesa
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });

  } catch (error) {
    console.error('M-Pesa callback error:', error);
    // Still return success to M-Pesa to prevent retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });
  }
}