import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;

    // Validate invoiceId parameter
    if (!invoiceId || isNaN(parseInt(invoiceId))) {
      return NextResponse.json(
        {
          error: 'Valid invoice ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const id = parseInt(invoiceId);

    // Query invoice by ID
    const invoiceResult = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (invoiceResult.length === 0) {
      return NextResponse.json(
        {
          error: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const invoice = invoiceResult[0];

    // Verify invoice has freelancerId assigned
    if (!invoice.freelancerId) {
      return NextResponse.json(
        {
          error: 'Invoice does not have a freelancer assigned',
          code: 'NO_FREELANCER_ASSIGNED'
        },
        { status: 400 }
      );
    }

    // Check if invoice is already paid
    if (invoice.isPaid) {
      return NextResponse.json(
        {
          error: 'Invoice is already marked as paid',
          code: 'ALREADY_PAID'
        },
        { status: 400 }
      );
    }

    // Get freelancer user record
    const freelancerResult = await db
      .select()
      .from(users)
      .where(eq(users.id, invoice.freelancerId))
      .limit(1);

    if (freelancerResult.length === 0) {
      return NextResponse.json(
        {
          error: 'Freelancer not found',
          code: 'FREELANCER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const freelancer = freelancerResult[0];
    const currentTimestamp = new Date().toISOString();

    // Perform transaction: Update invoice
    const updatedInvoiceResult = await db
      .update(invoices)
      .set({
        isPaid: true,
        paidAt: currentTimestamp,
        updatedAt: currentTimestamp
      })
      .where(eq(invoices.id, id))
      .returning();

    const updatedInvoice = updatedInvoiceResult[0];

    // Update freelancer user: Add freelancerAmount to earned and totalEarnings
    const updatedFreelancerResult = await db
      .update(users)
      .set({
        earned: freelancer.earned + invoice.freelancerAmount,
        totalEarnings: freelancer.totalEarnings + invoice.freelancerAmount,
        updatedAt: currentTimestamp
      })
      .where(eq(users.id, invoice.freelancerId))
      .returning();

    const updatedFreelancer = updatedFreelancerResult[0];

    // Remove password from freelancer object
    const { password, ...freelancerWithoutPassword } = updatedFreelancer;

    // Return both updated invoice and updated user data
    return NextResponse.json(
      {
        invoice: updatedInvoice,
        freelancer: freelancerWithoutPassword
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message
      },
      { status: 500 }
    );
  }
}