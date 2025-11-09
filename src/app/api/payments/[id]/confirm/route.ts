import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, jobs, users, notifications, invoices } from '@/db/schema';
import { eq, gte, and, sql } from 'drizzle-orm';
import { sendEmail, getPaymentConfirmedEmailHTML } from '@/lib/email';
import { calculateFreelancerAmount, calculateAdminCommission } from '@/lib/payment-calculations';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid payment ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const paymentId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { confirmed } = body;

    // Validate confirmed field
    if (typeof confirmed !== 'boolean') {
      return NextResponse.json(
        { 
          error: 'Confirmed field is required and must be a boolean',
          code: 'INVALID_CONFIRMED_FIELD' 
        },
        { status: 400 }
      );
    }

    // Check if payment exists
    const existingPayment = await db.select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (existingPayment.length === 0) {
      return NextResponse.json(
        { 
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const payment = existingPayment[0];
    const currentTimestamp = new Date().toISOString();

    if (confirmed) {
      // PAYMENT CONFIRMED - Execute full completion flow
      
      // Update payment to confirmed
      const updatedPayment = await db.update(payments)
        .set({
          status: 'confirmed',
          confirmedByAdmin: true,
          confirmedAt: currentTimestamp,
          updatedAt: currentTimestamp
        })
        .where(eq(payments.id, paymentId))
        .returning();

      // Get job details
      const job = await db.select()
        .from(jobs)
        .where(eq(jobs.id, payment.jobId))
        .limit(1);

      if (job.length === 0) {
        return NextResponse.json(
          { 
            error: 'Associated job not found',
            code: 'JOB_NOT_FOUND' 
          },
          { status: 404 }
        );
      }

      const jobData = job[0];

      // Calculate amounts using centralized function - 70% freelancer, 30% admin
      const freelancerAmount = calculateFreelancerAmount(payment.amount);
      const adminCommission = calculateAdminCommission(payment.amount);

      // Update job to completed and mark payment as confirmed
      await db.update(jobs)
        .set({
          status: 'completed',
          paymentConfirmed: true,
          updatedAt: currentTimestamp
        })
        .where(eq(jobs.id, payment.jobId));

      // Get freelancer details and update balance
      if (jobData.assignedFreelancerId) {
        const freelancer = await db.select()
          .from(users)
          .where(eq(users.id, jobData.assignedFreelancerId))
          .limit(1);

        if (freelancer.length > 0) {
          const freelancerData = freelancer[0];
          const newBalance = freelancerData.balance + freelancerAmount;
          const newEarned = freelancerData.earned + freelancerAmount;
          const newTotalEarnings = freelancerData.totalEarnings + freelancerAmount;
          
          // Update freelancer balance and earnings (incremental)
          await db.update(users)
            .set({
              balance: newBalance,
              earned: newEarned,
              totalEarnings: newTotalEarnings,
              completedJobs: freelancerData.completedJobs + 1,
              updatedAt: currentTimestamp
            })
            .where(eq(users.id, jobData.assignedFreelancerId));

          // NEW: Ensure automation by recalculating balance from all completed & paid jobs (source of truth)
          try {
            const agg = await db
              .select({
                totalBalance: sql<number>`COALESCE(ROUND(SUM(${jobs.amount} * 0.7), 2), 0)`,
              })
              .from(jobs)
              .where(and(
                eq(jobs.assignedFreelancerId, jobData.assignedFreelancerId),
                eq(jobs.status, 'completed'),
                eq(jobs.paymentConfirmed, true)
              ));

            const computedBalance = Number(agg[0]?.totalBalance || 0);
            await db.update(users)
              .set({ balance: computedBalance, updatedAt: currentTimestamp })
              .where(eq(users.id, jobData.assignedFreelancerId));
          } catch (recalcErr) {
            console.error('Balance recalculation error:', recalcErr);
          }

          // Create notification for freelancer
          await db.insert(notifications).values({
            userId: jobData.assignedFreelancerId,
            jobId: payment.jobId,
            type: 'payment_received',
            title: 'Payment Confirmed!',
            message: `Payment confirmed! KES ${freelancerAmount.toFixed(2)} has been added to your balance.`,
            read: 0,
            createdAt: currentTimestamp
          });

          // Send email to freelancer
          try {
            await sendEmail({
              to: freelancerData.email,
              subject: '💰 Payment Received on TaskLynk!',
              html: getPaymentConfirmedEmailHTML(
                freelancerData.name,
                jobData.title,
                freelancerAmount,
                newBalance
              ),
            });
          } catch (emailError) {
            console.error('Failed to send email to freelancer:', emailError);
          }

          // CREATE FREELANCER INVOICE with 70/30 split
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const todayInvoices = await db.select().from(invoices)
            .where(gte(invoices.createdAt, startOfDay));
          const sequenceNum = (todayInvoices.length + 1).toString().padStart(5, '0');
          const invoiceNumber = `INV-${dateStr}-${sequenceNum}`;

          await db.insert(invoices).values({
            jobId: payment.jobId,
            clientId: payment.clientId,
            freelancerId: jobData.assignedFreelancerId,
            invoiceNumber,
            amount: payment.amount,
            freelancerAmount: freelancerAmount,
            adminCommission: adminCommission,
            description: `Payment for order ${jobData.displayId || jobData.id} - ${jobData.title}`,
            status: 'paid',
            isPaid: true,
            paidAt: currentTimestamp,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
          });
        }
      }

      // Get client details and send notification
      const client = await db.select()
        .from(users)
        .where(eq(users.id, payment.clientId))
        .limit(1);

      if (client.length > 0) {
        // Create notification for client
        await db.insert(notifications).values({
          userId: payment.clientId,
          jobId: payment.jobId,
          type: 'order_completed',
          title: 'Payment Confirmed!',
          message: `Payment confirmed! Your order #${jobData.displayId} is now complete.`,
          read: 0,
          createdAt: currentTimestamp
        });

        // Send email to client
        try {
          await sendEmail({
            to: client[0].email,
            subject: '✅ Payment Confirmed - Order Complete!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1D3557;">Payment Confirmed!</h2>
                <p>Hello ${client[0].name},</p>
                <p>Your payment of <strong>KES ${payment.amount.toFixed(2)}</strong> has been confirmed.</p>
                <p>Your order <strong>#${jobData.displayId} - ${jobData.title}</strong> is now complete.</p>
                <p>Thank you for using TaskLynk!</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/jobs/${jobData.id}" style="display: inline-block; background-color: #1D3557; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Order</a>
              </div>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send email to client:', emailError);
        }
      }

      return NextResponse.json({
        payment: updatedPayment[0],
        message: 'Payment confirmed, order completed, freelancer balance updated, and invoice created successfully'
      }, { status: 200 });

    } else {
      // PAYMENT REJECTED/FAILED
      
      // Update payment to failed
      const updatedPayment = await db.update(payments)
        .set({
          status: 'failed',
          confirmedByAdmin: false,
          updatedAt: currentTimestamp
        })
        .where(eq(payments.id, paymentId))
        .returning();

      // Get client details
      const client = await db.select()
        .from(users)
        .where(eq(users.id, payment.clientId))
        .limit(1);

      if (client.length > 0) {
        // Create notification for client
        await db.insert(notifications).values({
          userId: payment.clientId,
          jobId: payment.jobId,
          type: 'payment_failed',
          title: 'Payment Verification Failed',
          message: 'Payment verification failed. Please try again with the correct M-Pesa code or use M-Pesa Direct Pay.',
          read: 0,
          createdAt: currentTimestamp
        });

        // Send email to client
        try {
          await sendEmail({
            to: client[0].email,
            subject: '❌ Payment Verification Failed',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #D32F2F;">Payment Verification Failed</h2>
                <p>Hello ${client[0].name},</p>
                <p>Unfortunately, we could not verify your payment of <strong>KES ${payment.amount.toFixed(2)}</strong>.</p>
                <p>Please try again:</p>
                <ul>
                  <li>Double-check your M-Pesa code and resubmit</li>
                  <li>Or use M-Pesa Direct Pay for instant verification</li>
                </ul>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/jobs/${payment.jobId}" style="display: inline-block; background-color: #1D3557; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Retry Payment</a>
              </div>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send email to client:', emailError);
        }
      }

      return NextResponse.json({
        payment: updatedPayment[0],
        message: 'Payment marked as failed'
      }, { status: 200 });
    }

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}