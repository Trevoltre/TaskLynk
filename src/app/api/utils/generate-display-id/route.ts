import { db } from '@/db';
import { users, jobs } from '@/db/schema';
import { eq, and, gte, lt } from 'drizzle-orm';

/**
 * Generates a unique display ID for a user based on their role
 * @param role - User role: 'admin', 'client', 'freelancer', or 'account_owner'
 * @returns Formatted display ID string
 */
export async function generateUserDisplayId(role: string): Promise<string> {
  try {
    // Validate role
    if (!['admin', 'client', 'freelancer', 'account_owner'].includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    // Count existing users with this role
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, role));

    const count = existingUsers.length;
    const nextNumber = count + 1;

    // Generate display ID based on role
    let displayId: string;

    switch (role) {
      case 'admin':
        // Format: ADMN#0001 (4 digits)
        displayId = `ADMN#${nextNumber.toString().padStart(4, '0')}`;
        break;
      case 'freelancer':
        // Format: FRL#00000001 (8 digits)
        displayId = `FRL#${nextNumber.toString().padStart(8, '0')}`;
        break;
      case 'client':
        // Format: CLT#0000001 (7 digits)
        displayId = `CLT#${nextNumber.toString().padStart(7, '0')}`;
        break;
      case 'account_owner':
        // Format: CLT#0000001 (treat as client)
        displayId = `CLT#${nextNumber.toString().padStart(7, '0')}`;
        break;
      default:
        throw new Error(`Unhandled role: ${role}`);
    }

    return displayId;
  } catch (error) {
    console.error('Error generating user display ID:', error);
    throw new Error(`Failed to generate display ID for role ${role}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a unique display ID for a job with year-based sequence
 * @returns Formatted display ID string (e.g., Order#2025000000001)
 */
export async function generateJobDisplayId(): Promise<string> {
  try {
    // Get current year
    const currentYear = new Date().getFullYear();

    // Create date range for current year
    const yearStart = new Date(currentYear, 0, 1).toISOString();
    const yearEnd = new Date(currentYear + 1, 0, 1).toISOString();

    // Count jobs created in current year
    const jobsThisYear = await db
      .select()
      .from(jobs)
      .where(
        and(
          gte(jobs.createdAt, yearStart),
          lt(jobs.createdAt, yearEnd)
        )
      );

    const count = jobsThisYear.length;
    const nextNumber = count + 1;

    // Format: Order#YYYY000000001 (year + 9 digits with leading zeros)
    const displayId = `Order#${currentYear}${nextNumber.toString().padStart(9, '0')}`;

    return displayId;
  } catch (error) {
    console.error('Error generating job display ID:', error);
    throw new Error(`Failed to generate job display ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}