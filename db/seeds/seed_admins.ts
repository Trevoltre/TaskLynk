import { db } from '@/db';
import { users, userStats } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function main() {
    const hashedPassword = await bcrypt.hash('kemoda2025', 10);
    const currentTimestamp = new Date().toISOString();
    
    const adminUsersData = [
        {
            displayId: 'ADMN#0001',
            email: 'topwriteessays@gmail.com',
            name: 'Admin User 1',
            phone: '+254700000001',
        },
        {
            displayId: 'ADMN#0002',
            email: 'm.d.techpoint25@gmail.com',
            name: 'Admin User 2',
            phone: '+254700000002',
        },
        {
            displayId: 'ADMN#0003',
            email: 'maguna956@gmail.com',
            name: 'Admin User 3',
            phone: '+254700000003',
        },
        {
            displayId: 'ADMN#0004',
            email: 'tasklynk01@gmail.com',
            name: 'Admin User 4',
            phone: '+254700000004',
        },
        {
            displayId: 'ADMN#0005',
            email: 'maxwellotieno11@gmail.com',
            name: 'Admin User 5',
            phone: '+254700000005',
        },
        {
            displayId: 'ADMN#0006',
            email: 'ashleydothy3162@gmail.com',
            name: 'Admin User 6',
            phone: '+254700000006',
        },
    ];

    let insertedCount = 0;
    const insertedUserIds: number[] = [];

    for (const adminData of adminUsersData) {
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, adminData.email))
            .limit(1);

        if (existingUser.length > 0) {
            console.log(`⚠️  Skipped: ${adminData.email} - User already exists`);
            continue;
        }

        const [insertedUser] = await db.insert(users).values({
            displayId: adminData.displayId,
            email: adminData.email,
            password: hashedPassword,
            name: adminData.name,
            role: 'admin',
            approved: true,
            status: 'active',
            phone: adminData.phone,
            balance: 0,
            rating: null,
            totalEarned: 0,
            totalSpent: 0,
            completedJobs: 0,
            completionRate: null,
            suspendedUntil: null,
            suspensionReason: null,
            blacklistReason: null,
            rejectedAt: null,
            rejectionReason: null,
            profilePictureUrl: null,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        }).returning();

        insertedUserIds.push(insertedUser.id);
        insertedCount++;
        console.log(`✅ Inserted: ${adminData.email} (ID: ${insertedUser.id})`);
    }

    for (const userId of insertedUserIds) {
        await db.insert(userStats).values({
            userId,
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
    }

    console.log(`\n📊 Summary: ${insertedCount} admin user(s) inserted successfully`);
    console.log('✅ Admin users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});