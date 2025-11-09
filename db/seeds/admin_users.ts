import { db } from '@/db';
import { users, userStats } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function main() {
    const timestamp = new Date().toISOString();
    
    const adminAccounts = [
        {
            email: 'topwriteessays@gmail.com',
            password: 'kemoda2025',
            name: 'Admin - TopWriteEssays',
            displayId: 'ADMN#0001',
            phone: '+254700000001',
        },
        {
            email: 'm.d.techpoint25@gmail.com',
            password: 'kemoda2025',
            name: 'Admin - MD TechPoint',
            displayId: 'ADMN#0002',
            phone: '+254700000002',
        },
        {
            email: 'maguna956@gmail.com',
            password: 'kemoda2025',
            name: 'Admin - Maguna',
            displayId: 'ADMN#0003',
            phone: '+254700000003',
        },
        {
            email: 'tasklynk01@gmail.com',
            password: 'kemoda2025',
            name: 'Admin - TaskLynk',
            displayId: 'ADMN#0004',
            phone: '+254700000004',
        },
        {
            email: 'maxwellotieno11@gmail.com',
            password: 'kemoda2025',
            name: 'Admin - Maxwell Otieno',
            displayId: 'ADMN#0005',
            phone: '+254700000005',
        },
        {
            email: 'ashleydothy3162@gmail.com',
            password: 'kemoda2025',
            name: 'Admin - Ashley Dothy',
            displayId: 'ADMN#0006',
            phone: '+254700000006',
        },
    ];

    for (const admin of adminAccounts) {
        // Check if user already exists
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, admin.email))
            .limit(1);

        if (existingUser.length > 0) {
            console.log(`⏭️  User ${admin.email} already exists, skipping...`);
            continue;
        }

        // Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(admin.password, 10);

        // Insert user
        const [newUser] = await db
            .insert(users)
            .values({
                displayId: admin.displayId,
                email: admin.email,
                password: hashedPassword,
                name: admin.name,
                role: 'admin',
                approved: true,
                balance: 0,
                earned: 0,
                totalEarnings: 0,
                rating: null,
                phone: admin.phone,
                status: 'active',
                suspendedUntil: null,
                suspensionReason: null,
                blacklistReason: null,
                rejectedAt: null,
                rejectionReason: null,
                totalEarned: 0,
                totalSpent: 0,
                completedJobs: 0,
                completionRate: null,
                profilePictureUrl: null,
                lastLoginAt: null,
                lastLoginIp: null,
                lastLoginDevice: null,
                loginCount: 0,
                domainId: null,
                freelancerBadge: null,
                clientTier: 'basic',
                clientPriority: 'regular',
                createdAt: timestamp,
                updatedAt: timestamp,
            })
            .returning();

        // Create corresponding userStats record
        await db.insert(userStats).values({
            userId: newUser.id,
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
            createdAt: timestamp,
            updatedAt: timestamp,
        });

        console.log(`✅ Created admin user: ${admin.email} (${admin.displayId})`);
    }

    console.log('✅ Admin users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});