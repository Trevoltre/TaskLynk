import { db } from '@/db';
import { users, userStats } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function main() {
    const adminEmails = [
        'topwriteessays@gmail.com',
        'm.d.techpoint25@gmail.com',
        'maguna956@gmail.com',
        'tasklynk01@gmail.com',
        'maxwellotieno11@gmail.com',
        'ashleydothy3162@gmail.com'
    ];

    // Delete existing users with these email addresses
    console.log('🗑️ Deleting existing admin users...');
    for (const email of adminEmails) {
        await db.delete(users).where(eq(users.email, email));
        console.log(`✅ Deleted user with email: ${email}`);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('kemoda2025', 10);
    const currentTimestamp = new Date().toISOString();

    const adminUsers = [
        {
            displayId: 'ADMN#0001',
            email: 'topwriteessays@gmail.com',
            password: hashedPassword,
            name: 'Admin User 1',
            phone: '+254700000001',
            role: 'admin',
            approved: 1,
            status: 'active',
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
            lastLoginAt: null,
            lastLoginIp: null,
            lastLoginDevice: null,
            loginCount: 0,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            displayId: 'ADMN#0002',
            email: 'm.d.techpoint25@gmail.com',
            password: hashedPassword,
            name: 'Admin User 2',
            phone: '+254700000002',
            role: 'admin',
            approved: 1,
            status: 'active',
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
            lastLoginAt: null,
            lastLoginIp: null,
            lastLoginDevice: null,
            loginCount: 0,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            displayId: 'ADMN#0003',
            email: 'maguna956@gmail.com',
            password: hashedPassword,
            name: 'Admin User 3',
            phone: '+254700000003',
            role: 'admin',
            approved: 1,
            status: 'active',
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
            lastLoginAt: null,
            lastLoginIp: null,
            lastLoginDevice: null,
            loginCount: 0,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            displayId: 'ADMN#0004',
            email: 'tasklynk01@gmail.com',
            password: hashedPassword,
            name: 'Admin User 4',
            phone: '+254700000004',
            role: 'admin',
            approved: 1,
            status: 'active',
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
            lastLoginAt: null,
            lastLoginIp: null,
            lastLoginDevice: null,
            loginCount: 0,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            displayId: 'ADMN#0005',
            email: 'maxwellotieno11@gmail.com',
            password: hashedPassword,
            name: 'Admin User 5',
            phone: '+254700000005',
            role: 'admin',
            approved: 1,
            status: 'active',
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
            lastLoginAt: null,
            lastLoginIp: null,
            lastLoginDevice: null,
            loginCount: 0,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            displayId: 'ADMN#0006',
            email: 'ashleydothy3162@gmail.com',
            password: hashedPassword,
            name: 'Admin User 6',
            phone: '+254700000006',
            role: 'admin',
            approved: 1,
            status: 'active',
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
            lastLoginAt: null,
            lastLoginIp: null,
            lastLoginDevice: null,
            loginCount: 0,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
    ];

    // Insert admin users
    console.log('📝 Inserting admin users...');
    const insertedUsers = await db.insert(users).values(adminUsers).returning();
    console.log(`✅ Inserted ${insertedUsers.length} admin users`);

    // Create userStats records for each inserted user
    console.log('📊 Creating userStats records...');
    const userStatsData = insertedUsers.map((user) => ({
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
    }));

    await db.insert(userStats).values(userStatsData);
    console.log(`✅ Created ${userStatsData.length} userStats records`);

    console.log('✅ Admin users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});