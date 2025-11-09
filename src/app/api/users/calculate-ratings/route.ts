import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, ratings } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Fetch all users who are clients, account_owners, or freelancers
    const allUsers = await db.select().from(users)
      .where(
        sql`${users.role} IN ('client', 'account_owner', 'freelancer')`
      );

    if (allUsers.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          totalUpdated: 0,
          clientsUpdated: 0,
          freelancersUpdated: 0
        },
        sampleUpdates: []
      }, { status: 200 });
    }

    let clientsUpdated = 0;
    let freelancersUpdated = 0;
    const sampleUpdates: Array<{ id: number; name: string; role: string; oldRating: number | null; newRating: number }> = [];

    for (const user of allUsers) {
      try {
        // Fetch last 20 ratings for this user
        const latestRatings = await db
          .select()
          .from(ratings)
          .where(eq(ratings.ratedUserId, user.id))
          .orderBy(desc(ratings.createdAt))
          .limit(20);

        if (latestRatings.length === 0) {
          // No ratings yet, skip updating to avoid overwriting existing values
          continue;
        }

        const avgLast20 = latestRatings.reduce((sum, r) => sum + (r.score || 0), 0) / latestRatings.length;
        // Round to 1 decimal place
        const newRating = Math.round(avgLast20 * 10) / 10;

        await db.update(users)
          .set({
            rating: newRating,
            updatedAt: new Date().toISOString()
          })
          .where(eq(users.id, user.id));

        if (user.role === 'freelancer') {
          freelancersUpdated++;
        } else {
          clientsUpdated++;
        }

        // Add to sample updates (first 5 only)
        if (sampleUpdates.length < 5) {
          sampleUpdates.push({
            id: user.id,
            name: user.name,
            role: user.role,
            oldRating: user.rating,
            newRating
          });
        }
      } catch (error) {
        // Log individual user calculation errors but continue
        console.error(`Error calculating rating for user ${user.id}:`, error);
        continue;
      }
    }

    const totalUpdated = clientsUpdated + freelancersUpdated;

    return NextResponse.json({
      success: true,
      summary: {
        totalUpdated,
        clientsUpdated,
        freelancersUpdated
      },
      sampleUpdates
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}