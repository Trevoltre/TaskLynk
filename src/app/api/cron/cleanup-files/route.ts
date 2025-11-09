import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobAttachments, jobs } from '@/db/schema';
import { eq, and, lt } from 'drizzle-orm';

// Optional Backblaze integration
let deleteFiles: any = null;
let STORAGE_BUCKETS: any = null;
let extractFilePathFromUrl: any = null;

try {
  const backblazeStorage = require('@/lib/backblaze-storage');
  deleteFiles = backblazeStorage.deleteFiles;
  STORAGE_BUCKETS = backblazeStorage.STORAGE_BUCKETS;
  extractFilePathFromUrl = backblazeStorage.extractFilePathFromUrl;
} catch (error) {
  console.log('[CRON] Backblaze B2 storage not configured, skipping file deletion from storage');
}

/**
 * Cron job to clean up files from completed orders after 1 week
 * This endpoint should be called by a cron service (Vercel Cron, etc.)
 * Schedule: Daily at midnight
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Calculate the cutoff date (1 week ago)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const cutoffDate = oneWeekAgo.toISOString();

    console.log('[CRON] Starting file cleanup for orders completed before:', cutoffDate);

    // Find all completed jobs older than 1 week
    const completedJobs = await db
      .select({ id: jobs.id, updatedAt: jobs.updatedAt })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'completed'),
          eq(jobs.clientApproved, true),
          lt(jobs.updatedAt, cutoffDate)
        )
      );

    console.log(`[CRON] Found ${completedJobs.length} jobs eligible for file cleanup`);

    if (completedJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No files to clean up',
        jobsProcessed: 0,
        filesDeleted: 0
      });
    }

    const jobIds = completedJobs.map(job => job.id);
    let totalFilesDeleted = 0;
    let totalJobsProcessed = 0;

    // Process each job's files
    for (const jobId of jobIds) {
      try {
        // Get all attachments for this job
        const attachments = await db
          .select()
          .from(jobAttachments)
          .where(eq(jobAttachments.jobId, jobId));

        if (attachments.length === 0) {
          continue;
        }

        // Delete files from Backblaze B2 Storage if configured
        if (deleteFiles && STORAGE_BUCKETS && extractFilePathFromUrl) {
          const filePaths: string[] = [];
          for (const attachment of attachments) {
            const path = extractFilePathFromUrl(attachment.fileUrl, STORAGE_BUCKETS.JOB_FILES);
            if (path) {
              filePaths.push(path);
            }
          }

          if (filePaths.length > 0) {
            const { error } = await deleteFiles(STORAGE_BUCKETS.JOB_FILES, filePaths);
            
            if (error) {
              console.error(`[CRON] Error deleting files for job ${jobId}:`, error);
            } else {
              console.log(`[CRON] Deleted ${filePaths.length} files from storage for job ${jobId}`);
            }
          }
        }

        // Delete file records from database
        await db.delete(jobAttachments)
          .where(eq(jobAttachments.jobId, jobId));

        totalFilesDeleted += attachments.length;
        totalJobsProcessed++;

        console.log(`[CRON] Cleaned up ${attachments.length} files for job ${jobId}`);
      } catch (error) {
        console.error(`[CRON] Error processing job ${jobId}:`, error);
        // Continue with next job even if one fails
      }
    }

    console.log(`[CRON] Cleanup completed. Processed ${totalJobsProcessed} jobs, deleted ${totalFilesDeleted} files`);

    return NextResponse.json({
      success: true,
      message: 'File cleanup completed successfully',
      jobsProcessed: totalJobsProcessed,
      filesDeleted: totalFilesDeleted,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CRON] Cleanup error:', error);
    return NextResponse.json(
      { 
        error: 'File cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing (requires secret)
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Redirect to POST handler
  return POST(request);
}