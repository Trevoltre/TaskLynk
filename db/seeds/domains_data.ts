import { db } from '@/db';
import { domains } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    const domainData = [
        {
            name: 'Engineering',
            description: 'Technical team members including developers, architects, and DevOps engineers',
            status: 'active',
            maxUsers: 50,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Marketing',
            description: 'Marketing team including content creators, SEO specialists, and social media managers',
            status: 'active',
            maxUsers: 30,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Sales',
            description: 'Sales representatives and account managers',
            status: 'active',
            maxUsers: 40,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Support',
            description: 'Customer support team and help desk agents',
            status: 'active',
            maxUsers: 35,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Management',
            description: 'Executive leadership and senior management',
            status: 'active',
            maxUsers: 20,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ];

    for (const domain of domainData) {
        const existing = await db.select().from(domains).where(eq(domains.name, domain.name));
        
        if (existing.length === 0) {
            await db.insert(domains).values(domain);
            console.log(`✅ Inserted domain: ${domain.name}`);
        } else {
            console.log(`⏭️  Skipped existing domain: ${domain.name}`);
        }
    }

    console.log('✅ Domains seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});