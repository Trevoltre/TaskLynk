import { db } from '@/db';
import { users, userStats } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function main() {
    const newUsers = [
        {
            name: "Rose Wambui",
            email: "rozziewamboi@gmail.com",
            phone: "0798614280",
            role: "freelancer" as const,
            approved: false,
            status: "active",
            freelancerBadge: null,
            clientTier: null,
            clientPriority: "regular",
        },
        {
            name: "Shem Orechi",
            email: "orechishem@gmail.com",
            phone: "0704493462",
            role: "freelancer" as const,
            approved: false,
            status: "active",
            freelancerBadge: null,
            clientTier: null,
            clientPriority: "regular",
        },
        {
            name: "Benson",
            email: "beeenmakk@gmail.com",
            phone: "0720022423",
            role: "freelancer" as const,
            approved: false,
            status: "active",
            freelancerBadge: null,
            clientTier: null,
            clientPriority: "regular",
        },
        {
            name: "Maxwel Ochieng",
            email: "maxwerty14@gmail.com",
            phone: "+254701066845",
            role: "freelancer" as const,
            approved: false,
            status: "active",
            freelancerBadge: null,
            clientTier: null,
            clientPriority: "regular",
        },
        {
            name: "TopNotch",
            email: "topnotch01writers@gmail.com",
            phone: "0741506045",
            role: "client" as const,
            approved: true,
            status: "active",
            freelancerBadge: null,
            clientTier: "basic",
            clientPriority: "regular",
        },
    ];

    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Get existing users to determine next display IDs
    const existingUsers = await db.select({
        displayId: users.displayId,
        role: users.role
    }).from(users);

    // Find highest display ID numbers for each role
    let highestFreelancerNum = 0;
    let highestClientNum = 0;

    existingUsers.forEach(user => {
        if (user.role === 'freelancer' && user.displayId.startsWith('FRL#')) {
            const num = parseInt(user.displayId.replace('FRL#', ''));
            if (num > highestFreelancerNum) highestFreelancerNum = num;
        } else if (user.role === 'client' && user.displayId.startsWith('CLT#')) {
            const num = parseInt(user.displayId.replace('CLT#', ''));
            if (num > highestClientNum) highestClientNum = num;
        }
    });

    let createdCount = 0;
    let skippedCount = 0;
    const currentTimestamp = new Date().toISOString();

    for (const userData of newUsers) {
        try {
            // Check if user already exists
            const existingUser = await db.select()
                .from(users)
                .where(eq(users.email, userData.email))
                .limit(1);

            if (existingUser.length > 0) {
                console.log(`⏭️  Skipped: ${userData.email} - User already exists`);
                skippedCount++;
                continue;
            }

            // Generate display ID
            let displayId: string;
            if (userData.role === 'freelancer') {
                highestFreelancerNum++;
                displayId = `FRL#${highestFreelancerNum.toString().padStart(8, '0')}`;
            } else {
                highestClientNum++;
                displayId = `CLT#${highestClientNum.toString().padStart(7, '0')}`;
            }

            // Insert user
            const insertedUsers = await db.insert(users).values({
                displayId,
                email: userData.email,
                password: hashedPassword,
                name: userData.name,
                role: userData.role,
                approved: userData.approved,
                balance: 0,
                earned: 0,
                totalEarnings: 0,
                rating: null,
                phone: userData.phone,
                status: userData.status,
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
                freelancerBadge: userData.freelancerBadge,
                clientTier: userData.clientTier,
                clientPriority: userData.clientPriority,
                createdAt: currentTimestamp,
                updatedAt: currentTimestamp,
            }).returning();

            const insertedUser = insertedUsers[0];

            // Create corresponding userStats record
            await db.insert(userStats).values({
                userId: insertedUser.id,
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

            console.log(`✅ Created ${userData.role}: ${userData.name} (${userData.email}) - ${displayId}`);
            createdCount++;
        } catch (error) {
            console.error(`❌ Failed to create user ${userData.email}:`, error);
        }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Created: ${createdCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users`);
    console.log('✅ New users batch seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});