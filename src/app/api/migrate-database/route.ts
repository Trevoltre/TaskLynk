import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

interface MigrationResult {
  success: boolean;
  timestamp: string;
  migrations: {
    applied: string[];
    count: number;
  };
  dataCopy: Record<string, { old: number; new: number; copied: number }>;
  verification: {
    adminAccounts: any[];
    userStatusDistribution: Record<string, number>;
    jobStatusDistribution: Record<string, number>;
    sampleUsers: any[];
    sampleJobs: any[];
  };
  errors: string[];
  warnings: string[];
}

export async function POST(request: NextRequest) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const appliedMigrations: string[] = [];
  const dataCopyResults: Record<string, { old: number; new: number; copied: number }> = {};

  try {
    // Environment setup
    const newDbUrl = 'libsql://tasklynk-database-tasklynknet.aws-us-east-2.turso.io';
    const newAuthToken = process.env.TURSO_AUTH_TOKEN;
    const oldDbUrl = 'libsql://tasklynk-database-maxwelldotech.turso.io';
    const oldAuthToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MzAwODIzMTgsImlkIjoiYzI3ODdmYTQtMjI1ZC00OTIxLTkxOWItOTg2MGRhMDhkN2QwIn0.b0v2mNKqXzXxZZwzWJXTnHKhgV4rkZmfGZHJi-sP95vElJIyUNhK9XkKd-YvLLY2-qEtZ7JjZqpUP5Oey5G0BA';

    if (!newAuthToken) {
      return NextResponse.json({
        error: 'TURSO_AUTH_TOKEN environment variable is not set',
        code: 'MISSING_AUTH_TOKEN'
      }, { status: 400 });
    }

    // Connect to both databases
    console.log('Connecting to databases...');
    const newDb = createClient({
      url: newDbUrl,
      authToken: newAuthToken
    });

    const oldDb = createClient({
      url: oldDbUrl,
      authToken: oldAuthToken
    });

    // Test connections
    try {
      await newDb.execute('SELECT 1');
      console.log('New database connection successful');
    } catch (error) {
      errors.push(`Failed to connect to new database: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        migrations: { applied: [], count: 0 },
        dataCopy: {},
        verification: {
          adminAccounts: [],
          userStatusDistribution: {},
          jobStatusDistribution: {},
          sampleUsers: [],
          sampleJobs: []
        },
        errors,
        warnings
      }, { status: 500 });
    }

    try {
      await oldDb.execute('SELECT 1');
      console.log('Old database connection successful');
    } catch (error) {
      errors.push(`Failed to connect to old database: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        migrations: { applied: [], count: 0 },
        dataCopy: {},
        verification: {
          adminAccounts: [],
          userStatusDistribution: {},
          jobStatusDistribution: {},
          sampleUsers: [],
          sampleJobs: []
        },
        errors,
        warnings
      }, { status: 500 });
    }

    // Step 1: Apply migrations
    console.log('Applying migrations...');
    const drizzlePath = path.join(process.cwd(), 'drizzle');
    
    try {
      const migrationFiles = fs.readdirSync(drizzlePath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        try {
          const migrationPath = path.join(drizzlePath, file);
          const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
          
          // Split by semicolon and execute each statement
          const statements = migrationSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

          for (const statement of statements) {
            try {
              await newDb.execute(statement);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              // Ignore "already exists" errors
              if (errorMsg.toLowerCase().includes('already exists')) {
                warnings.push(`Table/column already exists in ${file}, skipping`);
              } else {
                errors.push(`Error executing statement in ${file}: ${errorMsg}`);
              }
            }
          }
          
          appliedMigrations.push(file);
          console.log(`Applied migration: ${file}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to read migration ${file}: ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      warnings.push(`Could not read drizzle directory: ${errorMsg}`);
    }

    // Step 2: Copy data in correct FK order
    console.log('Starting data copy...');
    
    const tablesToCopy = [
      'domains',
      'users',
      'user_stats',
      'jobs',
      'bids',
      'payments',
      'invoices',
      'notifications',
      'messages',
      'job_messages',
      'revisions',
      'ratings',
      'job_attachments',
      'job_files',
      'email_logs'
    ];

    for (const tableName of tablesToCopy) {
      try {
        console.log(`Copying ${tableName}...`);
        
        // Get column names from new database
        const tableInfoResult = await newDb.execute(`PRAGMA table_info(${tableName})`);
        const columns = (tableInfoResult.rows as any[]).map((row: any) => row.name);
        
        if (columns.length === 0) {
          warnings.push(`Table ${tableName} not found in new database, skipping`);
          continue;
        }

        // Count records in old database
        const oldCountResult = await oldDb.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        const oldCount = (oldCountResult.rows[0] as any).count as number;

        // Select all data from old database
        const oldDataResult = await oldDb.execute(`SELECT * FROM ${tableName}`);
        const oldData = oldDataResult.rows;

        let copiedCount = 0;

        // Insert data into new database
        if (oldData.length > 0) {
          await newDb.execute('BEGIN TRANSACTION');
          
          try {
            for (const row of oldData) {
              const values = columns.map(col => (row as any)[col]);
              const placeholders = columns.map(() => '?').join(', ');
              const columnsList = columns.join(', ');
              
              try {
                await newDb.execute({
                  sql: `INSERT OR IGNORE INTO ${tableName} (${columnsList}) VALUES (${placeholders})`,
                  args: values
                });
                copiedCount++;
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                // Log but continue
                if (!errorMsg.toLowerCase().includes('unique constraint')) {
                  warnings.push(`Error inserting row into ${tableName}: ${errorMsg}`);
                }
              }
            }
            
            await newDb.execute('COMMIT');
          } catch (error) {
            await newDb.execute('ROLLBACK');
            throw error;
          }
        }

        // Count records in new database
        const newCountResult = await newDb.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        const newCount = (newCountResult.rows[0] as any).count as number;

        dataCopyResults[tableName] = {
          old: oldCount,
          new: newCount,
          copied: copiedCount
        };

        console.log(`${tableName}: old=${oldCount}, new=${newCount}, copied=${copiedCount}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Error copying ${tableName}: ${errorMsg}`);
        dataCopyResults[tableName] = {
          old: 0,
          new: 0,
          copied: 0
        };
      }
    }

    // Step 3: Verification
    console.log('Running verification...');
    
    const verification: MigrationResult['verification'] = {
      adminAccounts: [],
      userStatusDistribution: {},
      jobStatusDistribution: {},
      sampleUsers: [],
      sampleJobs: []
    };

    // Check admin accounts
    try {
      const adminEmails = [
        'topwriteessays@gmail.com',
        'm.d.techpoint25@gmail.com',
        'maguna956@gmail.com',
        'tasklynk01@gmail.com',
        'maxwellotieno11@gmail.com',
        'ashleydothy3162@gmail.com'
      ];

      for (const email of adminEmails) {
        try {
          const result = await newDb.execute({
            sql: 'SELECT email, name, role, approved FROM users WHERE email = ?',
            args: [email]
          });
          
          if (result.rows.length > 0) {
            const user = result.rows[0] as any;
            verification.adminAccounts.push({
              email: user.email,
              name: user.name,
              role: user.role,
              approved: Boolean(user.approved)
            });
          }
        } catch (error) {
          warnings.push(`Error checking admin ${email}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      warnings.push(`Error checking admin accounts: ${error instanceof Error ? error.message : String(error)}`);
    }

    // User status distribution
    try {
      const approvedResult = await newDb.execute('SELECT COUNT(*) as count FROM users WHERE approved = 1');
      const pendingResult = await newDb.execute('SELECT COUNT(*) as count FROM users WHERE approved = 0');
      
      verification.userStatusDistribution = {
        approved: (approvedResult.rows[0] as any).count as number,
        pending: (pendingResult.rows[0] as any).count as number
      };
    } catch (error) {
      warnings.push(`Error getting user status distribution: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Job status distribution
    try {
      const statuses = ['pending', 'approved', 'assigned', 'in_progress', 'editing', 'delivered', 'revision', 'revision_pending', 'completed', 'cancelled'];
      
      for (const status of statuses) {
        try {
          const result = await newDb.execute({
            sql: 'SELECT COUNT(*) as count FROM jobs WHERE status = ?',
            args: [status]
          });
          verification.jobStatusDistribution[status] = (result.rows[0] as any).count as number;
        } catch (error) {
          warnings.push(`Error counting jobs with status ${status}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      warnings.push(`Error getting job status distribution: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Sample users
    try {
      const usersResult = await newDb.execute('SELECT id, email, name, role, approved, created_at FROM users LIMIT 3');
      verification.sampleUsers = usersResult.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        approved: Boolean(row.approved),
        createdAt: row.created_at
      }));
    } catch (error) {
      warnings.push(`Error getting sample users: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Sample jobs
    try {
      const jobsResult = await newDb.execute('SELECT id, display_id, title, status, amount, created_at FROM jobs LIMIT 3');
      verification.sampleJobs = jobsResult.rows.map((row: any) => ({
        id: row.id,
        displayId: row.display_id,
        title: row.title,
        status: row.status,
        amount: row.amount,
        createdAt: row.created_at
      }));
    } catch (error) {
      warnings.push(`Error getting sample jobs: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Build response
    const response: MigrationResult = {
      success: errors.length === 0,
      timestamp: new Date().toISOString(),
      migrations: {
        applied: appliedMigrations,
        count: appliedMigrations.length
      },
      dataCopy: dataCopyResults,
      verification,
      errors,
      warnings
    };

    console.log('Migration complete');
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Migration error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(`Critical error: ${errorMsg}`);
    
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      migrations: {
        applied: appliedMigrations,
        count: appliedMigrations.length
      },
      dataCopy: dataCopyResults,
      verification: {
        adminAccounts: [],
        userStatusDistribution: {},
        jobStatusDistribution: {},
        sampleUsers: [],
        sampleJobs: []
      },
      errors,
      warnings
    }, { status: 500 });
  }
}