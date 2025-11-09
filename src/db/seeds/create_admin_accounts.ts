import { db } from '@/db';
import { users, userStats } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function main() {
    console.log('🔄 Starting admin accounts seeder...');

    // STEP 1: Hash the password 'kemoda2025' using bcrypt with 10 salt rounds
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash('kemoda2025', 10);
    console.log('✅ Password hashed successfully');

    // STEP 2: Get current timestamp
    const currentTimestamp = new Date().toISOString();
    console.log(`⏰ Current timestamp: ${currentTimestamp}`);

    // Admin user emails for cleanup
    const adminEmails = [
        'topwriteessays@gmail.com',
        'm.d.techpoint25@gmail.com',
        'maguna956@gmail.com',
        'tasklynk01@gmail.com',
        'maxwellotieno11@gmail.com',
        'ashleydothy3162@gmail.com'
    ];

    // STEP 3: Delete existing users with these email addresses
    console.log('🗑️  Deleting existing admin users...');
    await db.delete(users).where(
        or(
            eq(users.email, adminEmails[0]),
            eq(users.email, adminEmails[1]),
            eq(users.email, adminEmails[2]),
            eq(users.email, adminEmails[3]),
            eq(users.email, adminEmails[4]),
            eq(users.email, adminEmails[5])
        )
    );
    console.log('✅ Existing admin users deleted');

    // STEP 4: Insert 6 admin users with EXACT specifications
    console.log('👥 Creating admin users...');

    const adminUsers = [
        {
            displayId: 'ADMN#0001',
            email: 'topwriteessays@gmail.com',
            name: 'Admin User 1',
            phone: '+254700000001',
            password: hashedPassword,
            role: 'admin',
            approved: true,
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
            name: 'Admin User 2',
            phone: '+254700000002',
            password: hashedPassword,
            role: 'admin',
            approved: true,
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
            name: 'Admin User 3',
            phone: '+254700000003',
            password: hashedPassword,
            role: 'admin',
            approved: true,
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
            name: 'Admin User 4',
            phone: '+254700000004',
            password: hashedPassword,
            role: 'admin',
            approved: true,
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
            name: 'Admin User 5',
            phone: '+254700000005',
            password: hashedPassword,
            role: 'admin',
            approved: true,
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
            name: 'Admin User 6',
            phone: '+254700000006',
            password: hashedPassword,
            role: 'admin',
            approved: true,
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
        }
    ];

    const insertedUsers = await db.insert(users).values(adminUsers).returning();
    console.log(`✅ Created ${insertedUsers.length} admin users`);
    
    // Log inserted user IDs
    const userIds = insertedUsers.map(user => user.id);
    console.log('📋 Inserted user IDs:', userIds);

    // STEP 5: Create corresponding userStats records
    console.log('📊 Creating user stats records...');
    
    const userStatsData = insertedUsers.map(user => ({
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
    console.log(`✅ Created ${userStatsData.length} user stats records`);

    console.log('✅ Admin accounts seeder completed successfully');
    console.log('🎉 All 6 admin users are ready to use with password: kemoda2025');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});