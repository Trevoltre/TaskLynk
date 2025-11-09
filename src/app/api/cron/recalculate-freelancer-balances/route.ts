import { NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, users } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';

// Recalculate all freelancers' balances based on completed and payment-confirmed jobs
// Balance = 70% of each job.amount summed across qualifying jobs
export async function POST() {
  try {
    // Get all freelancers
    const freelancers = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'freelancer'));

    let updated = 0;
    const details: { freelancerId: number; newBalance: number; jobCount: number; totalAmount: number }[] = [];

    for (const f of freelancers) {
      // Sum qualified jobs for each freelancer
      const agg = await db
        .select({
          totalBalance: sql<number>`COALESCE(ROUND(SUM(${jobs.amount} * 0.7), 2), 0)`,
          totalCount: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`COALESCE(SUM(${jobs.amount}), 0)`
        })
        .from(jobs)
        .where(and(
          eq(jobs.assignedFreelancerId, f.id),
          eq(jobs.status, 'completed'),
          eq(jobs.paymentConfirmed, true)
        ));

      const newBalance = Number(agg[0].totalBalance || 0);
      const jobCount = Number(agg[0].totalCount || 0);
      const totalAmount = Number(agg[0].totalAmount || 0);

      // Update user's balance to match computed balance
      await db.update(users)
        .set({ balance: newBalance, updatedAt: new Date().toISOString() })
        .where(eq(users.id, f.id));

      updated++;
      details.push({ freelancerId: f.id, newBalance, jobCount, totalAmount });
    }

    return NextResponse.json({
      updated,
      details
    });
  } catch (error) {
    console.error('Recalculate balances cron error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  // Allow GET for manual trigger/monitoring in dev
  return POST();
}
