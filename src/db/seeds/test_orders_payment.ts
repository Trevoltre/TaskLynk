import { db } from '@/db';
import { users, jobs, payments, invoices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
    console.log('🚀 Starting test orders seeder...');

    // Check if test orders already exist
    const existingTestOrders = await db
        .select()
        .from(jobs)
        .where(
            and(
                eq(jobs.title, 'Test Order 1')
            )
        );

    if (existingTestOrders.length > 0) {
        console.log('⚠️  Test orders already exist. Skipping seeding to maintain idempotence.');
        return;
    }

    // Find client with displayId CLT#000006
    const clientResult = await db
        .select()
        .from(users)
        .where(eq(users.displayId, 'CLT#000006'))
        .limit(1);

    if (clientResult.length === 0) {
        throw new Error('❌ Client with displayId CLT#000006 not found. Please seed users first.');
    }

    const client = clientResult[0];
    const clientId = client.id;

    // Find freelancer with displayId FRL#000007
    const freelancerResult = await db
        .select()
        .from(users)
        .where(eq(users.displayId, 'FRL#000007'))
        .limit(1);

    if (freelancerResult.length === 0) {
        throw new Error('❌ Freelancer with displayId FRL#000007 not found. Please seed users first.');
    }

    const freelancer = freelancerResult[0];
    const freelancerId = freelancer.id;

    console.log(`✅ Found client: ${client.name} (ID: ${clientId})`);
    console.log(`✅ Found freelancer: ${freelancer.name} (ID: ${freelancerId})`);

    // Calculate dates
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Get the latest job displayId to generate sequential IDs
    const latestJob = await db
        .select()
        .from(jobs)
        .orderBy(jobs.id)
        .limit(1);

    let jobDisplayIdCounter = 1;
    if (latestJob.length > 0 && latestJob[0].displayId) {
        const match = latestJob[0].displayId.match(/JOB#(\d+)/);
        if (match) {
            jobDisplayIdCounter = parseInt(match[1]) + 1;
        }
    }

    const createdJobsSummary: Array<{
        jobId: number;
        displayId: string;
        title: string;
        amount: number;
        status: string;
        paymentStatus: string;
        invoiceStatus: string;
    }> = [];

    // Create 10 test orders
    for (let i = 1; i <= 10; i++) {
        const daysAgo = 11 - i; // Order 1 is 10 days ago, Order 10 is 1 day ago
        const jobCreatedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const jobUpdatedAt = new Date(jobCreatedAt.getTime() + 60 * 60 * 1000); // +1 hour
        const paymentCreatedAt = new Date(jobCreatedAt.getTime() + 15 * 60 * 1000); // +15 minutes
        const paymentConfirmedAt = new Date(jobCreatedAt.getTime() + 30 * 60 * 1000); // +30 minutes

        const displayId = `JOB#${String(jobDisplayIdCounter).padStart(6, '0')}`;
        jobDisplayIdCounter++;

        // Insert job
        const jobData = {
            displayId,
            clientId,
            assignedFreelancerId: freelancerId,
            title: `Test Order ${i}`,
            instructions: `Test order for payment testing - Order ${i}`,
            workType: 'Essay',
            amount: 20,
            status: 'delivered',
            adminApproved: true,
            clientApproved: false,
            paymentConfirmed: true,
            deadline: twoDaysFromNow.toISOString(),
            actualDeadline: twoDaysFromNow.toISOString(),
            freelancerDeadline: oneDayFromNow.toISOString(),
            requestDraft: false,
            draftDelivered: false,
            revisionRequested: false,
            placementPriority: 0,
            urgencyMultiplier: 1.0,
            calculatedPrice: 20,
            createdAt: jobCreatedAt.toISOString(),
            updatedAt: jobUpdatedAt.toISOString(),
        };

        const insertedJob = await db.insert(jobs).values(jobData).returning();
        const jobId = insertedJob[0].id;

        // Generate random 8-digit number for mpesa code
        const randomMpesaCode = `TEST${Math.floor(10000000 + Math.random() * 90000000)}`;

        // Insert payment
        const paymentData = {
            jobId,
            clientId,
            freelancerId,
            amount: 20,
            paymentMethod: 'mpesa',
            status: 'confirmed',
            mpesaCode: randomMpesaCode,
            phoneNumber: '+254700000000',
            confirmedByAdmin: true,
            confirmedAt: paymentConfirmedAt.toISOString(),
            createdAt: paymentCreatedAt.toISOString(),
            updatedAt: paymentConfirmedAt.toISOString(),
        };

        await db.insert(payments).values(paymentData);

        // Generate invoice number
        const timestamp = Date.now();
        const invoiceNumber = `INV-TEST-${timestamp}-${i}`;

        // Insert invoice
        const invoiceData = {
            jobId,
            clientId,
            freelancerId,
            invoiceNumber,
            amount: 20,
            freelancerAmount: 12, // 60% of 20
            adminCommission: 8, // 40% of 20
            description: `Payment for Test Order ${i}`,
            status: 'paid',
            isPaid: true,
            paidAt: paymentConfirmedAt.toISOString(),
            createdAt: paymentConfirmedAt.toISOString(),
            updatedAt: paymentConfirmedAt.toISOString(),
        };

        await db.insert(invoices).values(invoiceData);

        // Add to summary
        createdJobsSummary.push({
            jobId,
            displayId,
            title: `Test Order ${i}`,
            amount: 20,
            status: 'delivered',
            paymentStatus: 'confirmed',
            invoiceStatus: 'paid',
        });

        console.log(`✅ Created Test Order ${i} (${displayId})`);
    }

    // Print summary
    console.log('\n📊 Test Orders Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Job ID | Display ID      | Title         | Amount | Status    | Payment   | Invoice');
    console.log('───────────────────────────────────────────────────────────────');

    createdJobsSummary.forEach((order) => {
        console.log(
            `${String(order.jobId).padEnd(6)} | ${order.displayId.padEnd(15)} | ${order.title.padEnd(13)} | KSh ${String(order.amount).padEnd(2)} | ${order.status.padEnd(9)} | ${order.paymentStatus.padEnd(9)} | ${order.invoiceStatus}`
        );
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n✅ Successfully created ${createdJobsSummary.length} test orders with payments and invoices`);
    console.log(`📝 Client: ${client.name} (${client.displayId})`);
    console.log(`📝 Freelancer: ${freelancer.name} (${freelancer.displayId})`);
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});