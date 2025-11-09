import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobAttachments } from '@/db/schema';
import { and, lte, isNull } from 'drizzle-orm';
import { deleteFile, STORAGE_BUCKETS } from '@/lib/backblaze-storage';

/**
 * DELETE /api/files/cleanup-expired
 * 
 * Automatically deletes files that have passed their scheduled deletion date.
 * This endpoint should be called by a cron job or scheduled task.
 * 
 * Security: Can be protected with API key or run as internal endpoint only
 */
export async function DELETE(request: NextRequest) {
  try {
    // Optional: Verify API key for security
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.CRON_API_KEY;
    
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date().toISOString();

    // Find all files scheduled for deletion that haven't been deleted yet
    const expiredFiles = await db
      .select()
      .from(jobAttachments)
      .where(
        and(
          lte(jobAttachments.scheduledDeletionAt, now),
          isNull(jobAttachments.deletedAt)
        )
      )
      .all();

    if (expiredFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No files to delete',
        deletedCount: 0
      });
    }

    console.log(`Found ${expiredFiles.length} files to delete`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: number; fileName: string; error: string }> = [];

    // Delete each file from storage and mark as deleted in database
    for (const file of expiredFiles) {
      try {
        // Extract file path from URL for Supabase storage
        // Format: https://[project].supabase.co/storage/v1/object/public/job-files/job-123/...
        // or mock format: /mock-storage/job-files/...
        let filePath = '';
        
        if (file.fileUrl.includes('/mock-storage/')) {
          // Mock storage - just mark as deleted
          filePath = file.fileUrl.replace(/^.*\/mock-storage\/[^\/]+\//, '');
        } else if (file.fileUrl.includes('/storage/v1/object/public/')) {
          filePath = file.fileUrl.split('/storage/v1/object/public/')[1];
          // Remove bucket name from path
          filePath = filePath.replace(`${STORAGE_BUCKETS.JOB_FILES}/`, '');
        } else {
          // Unknown format - skip storage deletion but mark as deleted
          console.warn(`Unknown file URL format: ${file.fileUrl}`);
        }

        // Delete from Supabase storage (or skip if mock)
        if (filePath && !file.fileUrl.includes('/mock-storage/')) {
          const { success, error } = await deleteFile(STORAGE_BUCKETS.JOB_FILES, filePath);
          if (!success && error) {
            console.error(`Failed to delete file from storage: ${file.fileName}`, error);
            // Continue to mark as deleted in DB even if storage deletion fails
          }
        }

        // Mark as deleted in database
        await db
          .update(jobAttachments)
          .set({
            deletedAt: now,
            fileUrl: '[DELETED]', // Clear the URL to prevent access attempts
          })
          .where(db.$with('id').as(jobAttachments.id).$eq(file.id));

        successCount++;
        console.log(`Successfully deleted file: ${file.fileName} (ID: ${file.id})`);
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          id: file.id,
          fileName: file.fileName,
          error: errorMessage
        });
        console.error(`Failed to delete file ${file.id} (${file.fileName}):`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Deleted ${successCount} files.`,
      deletedCount: successCount,
      errorCount,
      totalProcessed: expiredFiles.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/files/cleanup-expired
 * 
 * Returns information about files scheduled for deletion
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date().toISOString();

    // Find all files scheduled for deletion
    const scheduledFiles = await db
      .select({
        id: jobAttachments.id,
        jobId: jobAttachments.jobId,
        fileName: jobAttachments.fileName,
        fileSize: jobAttachments.fileSize,
        scheduledDeletionAt: jobAttachments.scheduledDeletionAt,
        deletedAt: jobAttachments.deletedAt,
        createdAt: jobAttachments.createdAt,
      })
      .from(jobAttachments)
      .where(
        and(
          lte(jobAttachments.scheduledDeletionAt, now),
          isNull(jobAttachments.deletedAt)
        )
      )
      .all();

    // Get upcoming deletions (within next 24 hours)
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    
    const upcomingFiles = await db
      .select({
        id: jobAttachments.id,
        jobId: jobAttachments.jobId,
        fileName: jobAttachments.fileName,
        scheduledDeletionAt: jobAttachments.scheduledDeletionAt,
      })
      .from(jobAttachments)
      .where(
        and(
          lte(jobAttachments.scheduledDeletionAt, oneDayFromNow.toISOString()),
          isNull(jobAttachments.deletedAt)
        )
      )
      .all();

    return NextResponse.json({
      expiredFilesCount: scheduledFiles.length,
      expiredFiles: scheduledFiles,
      upcomingDeletionsCount: upcomingFiles.length,
      upcomingDeletions: upcomingFiles,
      currentTime: now
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}