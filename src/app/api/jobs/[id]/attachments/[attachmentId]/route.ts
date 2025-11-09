import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobAttachments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    const { id: jobId, attachmentId } = params;

    // Validate jobId parameter
    if (!jobId || isNaN(parseInt(jobId))) {
      return NextResponse.json(
        {
          error: 'Valid job ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Validate attachmentId parameter
    if (!attachmentId || isNaN(parseInt(attachmentId))) {
      return NextResponse.json(
        {
          error: 'Valid attachment ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const parsedJobId = parseInt(jobId);
    const parsedAttachmentId = parseInt(attachmentId);

    // Check if attachment exists and belongs to the specified job
    const existingAttachment = await db
      .select()
      .from(jobAttachments)
      .where(
        and(
          eq(jobAttachments.id, parsedAttachmentId),
          eq(jobAttachments.jobId, parsedJobId)
        )
      )
      .limit(1);

    if (existingAttachment.length === 0) {
      return NextResponse.json(
        {
          error: 'Attachment not found or does not belong to the specified job',
          code: 'ATTACHMENT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Delete the attachment
    const deleted = await db
      .delete(jobAttachments)
      .where(
        and(
          eq(jobAttachments.id, parsedAttachmentId),
          eq(jobAttachments.jobId, parsedJobId)
        )
      )
      .returning();

    return NextResponse.json(
      {
        message: 'Attachment deleted successfully',
        attachment: deleted[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE attachment error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}