import { db } from '@/db';
import { domains } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    const currentTimestamp = new Date().toISOString();
    
    const sampleDomains = [
        {
            name: 'Engineering',
            description: 'Technical team members including developers, architects, and DevOps engineers',
            status: 'active',
            maxUsers: 50,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Marketing',
            description: 'Marketing team including content creators, SEO specialists, and social media managers',
            status: 'active',
            maxUsers: 30,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Sales',
            description: 'Sales representatives and account managers',
            status: 'active',
            maxUsers: 40,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Support',
            description: 'Customer support team and help desk agents',
            status: 'active',
            maxUsers: 35,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Management',
            description: 'Executive leadership and senior management',
            status: 'active',
            maxUsers: 20,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
    ];

    console.log('🌱 Starting domains seeder...\n');

    for (const domain of sampleDomains) {
        const existingDomain = await db
            .select()
            .from(domains)
            .where(eq(domains.name, domain.name))
            .limit(1);

        if (existingDomain.length > 0) {
            console.log(`⏭️  Skipped: "${domain.name}" domain already exists`);
        } else {
            await db.insert(domains).values(domain);
            console.log(`✅ Created: "${domain.name}" domain`);
        }
    }

    console.log('\n✅ Domains seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});