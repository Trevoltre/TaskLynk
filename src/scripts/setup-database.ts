/**
 * Database Setup and Recovery Script
 * Run this after updating your Turso credentials
 */

import { db } from '@/db';
import { users } from '@/db/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  try {
    // Test database connection
    console.log('1️⃣ Testing database connection...');
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful!\n');

    // Check if users table exists
    console.log('2️⃣ Checking if tables exist...');
    const tableCheck = await db.execute(
      sql`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`
    );
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Users table does not exist!');
      console.log('📝 Please run: npm run db:push\n');
      return;
    }
    console.log('✅ Tables exist!\n');

    // Seed admin accounts
    console.log('3️⃣ Setting up admin accounts...');
    const adminEmails = [
      'topwriteessays@gmail.com',
      'm.d.techpoint25@gmail.com',
      'maguna956@gmail.com',
      'tasklynk01@gmail.com',
      'maxwellotieno11@gmail.com',
      'ashleydothy3162@gmail.com',
    ];

    const password = 'kemoda2025';
    const hashedPassword = await bcrypt.hash(password, 10);

    for (const email of adminEmails) {
      try {
        // Check if admin already exists
        const existing = await db.execute(
          sql`SELECT id FROM users WHERE email = ${email}`
        );

        if (existing.rows.length === 0) {
          // Extract name from email
          const name = email
            .split('@')[0]
            .split('.')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          // Generate display ID
          const displayId = `ADM${Date.now()}${Math.floor(Math.random() * 1000)}`;

          // Insert admin
          await db.execute(sql`
            INSERT INTO users (
              display_id, email, password, name, role, approved, 
              status, phone, balance, earned, total_earnings,
              total_earned, total_spent, completed_jobs, login_count,
              created_at, updated_at
            ) VALUES (
              ${displayId}, ${email}, ${hashedPassword}, ${name}, 'admin', 1,
              'active', '0701066845', 0, 0, 0,
              0, 0, 0, 0,
              datetime('now'), datetime('now')
            )
          `);
          console.log(`✅ Created admin: ${email}`);
        } else {
          console.log(`⏭️  Admin exists: ${email}`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to create ${email}:`, error.message);
      }
    }

    console.log('\n4️⃣ Verifying admin accounts...');
    const admins = await db.execute(
      sql`SELECT email, name, role, approved, status FROM users WHERE role = 'admin'`
    );
    console.log(`✅ Found ${admins.rows.length} admin accounts`);
    admins.rows.forEach((admin: any) => {
      console.log(`   - ${admin.email} (${admin.name})`);
    });

    console.log('\n✨ Database setup complete!');
    console.log('\n📋 Summary:');
    console.log('   - Database connection: ✅');
    console.log('   - Tables: ✅');
    console.log(`   - Admin accounts: ${admins.rows.length}`);
    console.log('\n🎉 You can now login with any admin email and password: kemoda2025');
  } catch (error: any) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Verify TURSO_CONNECTION_URL in .env');
    console.error('   2. Verify TURSO_AUTH_TOKEN in .env');
    console.error('   3. Run: npm run db:push');
    console.error('   4. Try again');
  }
}

setupDatabase();