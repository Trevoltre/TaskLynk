import { db } from '@/db';
import { users, userStats } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length === 0) {
        console.log('⚠️  No users found in database. Please seed users first.');
        return;
    }

    console.log(`📊 Found ${existingUsers.length} users. Checking userStats...`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const user of existingUsers) {
        const existingStats = await db
            .select()
            .from(userStats)
            .where(eq(userStats.userId, user.id));
        
        if (existingStats.length > 0) {
            console.log(`⏭️  UserStats already exists for user ID: ${user.id} (${user.name})`);
            skippedCount++;
            continue;
        }
        
        const currentTimestamp = new Date().toISOString();
        
        await db.insert(userStats).values({
            userId: user.id,
            totalJobsPosted: 0,
            totalJobsCompleted: 0,
            totalJobsCancelled: 0,
            totalAmountEarned: 0,
            totalAmountSpent: 0,
            averageRating: null,
            totalRatings: 0,
            onTimeDelivery: 0,
            lateDelivery: 0,
            revisionsRequested: 0,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        });
        
        console.log(`✅ Created userStats for user ID: ${user.id} (${user.name})`);
        createdCount++;
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   - Created: ${createdCount} userStats records`);
    console.log(`   - Skipped: ${skippedCount} existing records`);
    console.log(`   - Total users processed: ${existingUsers.length}`);
    console.log('\n✅ UserStats seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});