import { NextResponse } from "next/server";
import { createClient, Client } from "@libsql/client";
import fs from "fs";
import path from "path";

export const preferredRegion = ["iad1"]; // runtime hint only

function getEnv(name: string, required = true) {
  const v = process.env[name];
  if (required && !v) throw new Error(`Missing env: ${name}`);
  return v as string;
}

function splitSqlStatements(sql: string): string[] {
  // Remove line and block comments
  const withoutComments = sql
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/--.*$/gm, ""); // line comments

  // Split on semicolons not inside quotes
  const parts = withoutComments
    .split(/;(?=(?:[^'\"]|'[^']*'|\"[^\"]*\")*$)/g)
    .map((s) => s.trim())
    .filter(Boolean);

  return parts;
}

async function runMigrations(dest: Client) {
  const drizzleDir = path.join(process.cwd(), "drizzle");
  const files = fs
    .readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied: { file: string; statements: number }[] = [];
  for (const file of files) {
    const full = path.join(drizzleDir, file);
    const sql = fs.readFileSync(full, "utf8");

    const statements = splitSqlStatements(sql);
    for (const stmt of statements) {
      if (!stmt) continue;
      try {
        await dest.execute(stmt);
      } catch (e: any) {
        const msg = String(e?.message || e);
        // Ignore idempotent errors when re-running migrations
        const ignorable = [
          "already exists",
          "duplicate column",
          "duplicate key",
          "SQLITE_CONSTRAINT",
        ].some((k) => msg.toLowerCase().includes(k));
        if (!ignorable) {
          throw new Error(`Migration failed in ${file}: ${msg}`);
        }
      }
    }
    applied.push({ file, statements: statements.length });
  }
  return applied;
}

async function copyTable(source: Client, dest: Client, table: string) {
  // Get columns from source PRAGMA
  const pragma = await source.execute(`PRAGMA table_info(${table});`);
  const columns = pragma.rows.map((r: any) => r.name as string);
  if (!columns.length) return { table, rows: 0 };

  // Read all rows from source
  const rowsRes = await source.execute(`SELECT ${columns.map((c) => `\`${c}\``).join(",")} FROM ${table};`);
  const rows = rowsRes.rows as any[];
  if (!rows.length) return { table, rows: 0 };

  // Build insert statement with explicit columns; use INSERT OR IGNORE to avoid dup errors
  const placeholders = `(${columns.map(() => "?").join(",")})`;
  const insertSql = `INSERT OR IGNORE INTO ${table} (${columns.map((c) => `\`${c}\``).join(",")}) VALUES ${placeholders};`;

  // Run in transaction
  await dest.execute("BEGIN;");
  try {
    for (const row of rows) {
      const values = columns.map((c) => (row as any)[c]);
      await dest.execute({ sql: insertSql, args: values });
    }
    await dest.execute("COMMIT;");
  } catch (e) {
    await dest.execute("ROLLBACK;");
    throw e;
  }

  return { table, rows: rows.length };
}

async function getVerificationData(dest: Client) {
  const verification: any = {
    adminAccounts: [],
    userStatusDistribution: {},
    jobStatusDistribution: {},
    sampleUsers: [],
    sampleJobs: []
  };

  // Check admin accounts
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
      const result = await dest.execute({
        sql: 'SELECT email, name, role, approved FROM users WHERE email = ?',
        args: [email]
      });
      
      if (result.rows.length > 0) {
        verification.adminAccounts.push(result.rows[0]);
      }
    } catch (error) {
      console.error(`Error checking admin ${email}:`, error);
    }
  }

  // User status distribution
  try {
    const approvedResult = await dest.execute('SELECT COUNT(*) as count FROM users WHERE approved = 1');
    const pendingResult = await dest.execute('SELECT COUNT(*) as count FROM users WHERE approved = 0');
    
    verification.userStatusDistribution = {
      approved: (approvedResult.rows[0] as any).count,
      pending: (pendingResult.rows[0] as any).count
    };
  } catch (error) {
    console.error('Error getting user status:', error);
  }

  // Job status distribution
  try {
    const statuses = ['pending', 'approved', 'assigned', 'in_progress', 'editing', 'delivered', 'revision', 'revision_pending', 'completed', 'cancelled'];
    
    for (const status of statuses) {
      const result = await dest.execute({
        sql: 'SELECT COUNT(*) as count FROM jobs WHERE status = ?',
        args: [status]
      });
      verification.jobStatusDistribution[status] = (result.rows[0] as any).count;
    }
  } catch (error) {
    console.error('Error getting job status:', error);
  }

  // Sample users
  try {
    const usersResult = await dest.execute('SELECT id, email, name, role, approved, created_at FROM users LIMIT 3');
    verification.sampleUsers = usersResult.rows;
  } catch (error) {
    console.error('Error getting sample users:', error);
  }

  // Sample jobs
  try {
    const jobsResult = await dest.execute('SELECT id, display_id, title, status, amount, created_at FROM jobs LIMIT 3');
    verification.sampleJobs = jobsResult.rows;
  } catch (error) {
    console.error('Error getting sample jobs:', error);
  }

  return verification;
}

export async function POST() {
  try {
    const destUrl = getEnv("TURSO_CONNECTION_URL");
    const destToken = getEnv("TURSO_AUTH_TOKEN");

    const sourceUrl = getEnv("SOURCE_TURSO_URL", false);
    const sourceToken = getEnv("SOURCE_TURSO_TOKEN", false);

    const dest = createClient({ url: destUrl, authToken: destToken });

    // 1) Run migrations on destination (one statement at a time)
    console.log("Running migrations...");
    const appliedMigrations = await runMigrations(dest);
    console.log(`Applied ${appliedMigrations.length} migrations`);

    // 2) If source provided, copy data table-by-table in FK-safe order
    const copyReports: any[] = [];
    const dataCopyResults: Record<string, { old: number; new: number; copied: number }> = {};
    
    if (sourceUrl && sourceToken) {
      console.log("Copying data from source database...");
      const source = createClient({ url: sourceUrl, authToken: sourceToken });

      // Temporarily disable FKs for bulk copy
      await dest.execute("PRAGMA foreign_keys=OFF;");

      // Order matters due to FKs
      const tables = [
        "domains",
        "users",
        "user_stats",
        "jobs",
        "bids",
        "payments",
        "invoices",
        "notifications",
        "messages",
        "job_messages",
        "revisions",
        "ratings",
        "job_attachments",
        "job_files",
        "email_logs",
      ];

      for (const t of tables) {
        try {
          console.log(`Copying table: ${t}`);
          
          // Count old records
          const oldCountResult = await source.execute(`SELECT COUNT(*) as count FROM ${t}`);
          const oldCount = (oldCountResult.rows[0] as any).count;
          
          // Copy table
          const rep = await copyTable(source, dest, t);
          
          // Count new records
          const newCountResult = await dest.execute(`SELECT COUNT(*) as count FROM ${t}`);
          const newCount = (newCountResult.rows[0] as any).count;
          
          copyReports.push(rep);
          dataCopyResults[t] = {
            old: oldCount,
            new: newCount,
            copied: rep.rows
          };
          
          console.log(`${t}: old=${oldCount}, new=${newCount}, copied=${rep.rows}`);
        } catch (err: any) {
          console.error(`Error copying ${t}:`, err);
          copyReports.push({ table: t, error: err?.message || String(err) });
          dataCopyResults[t] = { old: 0, new: 0, copied: 0 };
        }
      }

      await dest.execute("PRAGMA foreign_keys=ON;");
    }

    // 3) Get verification data
    console.log("Running verification...");
    const verification = await getVerificationData(dest);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      appliedMigrations,
      copied: copyReports,
      dataCopy: dataCopyResults,
      verification,
      summary: {
        migrationsApplied: appliedMigrations.length,
        tablesProcessed: copyReports.length,
        totalRecordsCopied: Object.values(dataCopyResults).reduce((sum, t) => sum + t.copied, 0)
      }
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}