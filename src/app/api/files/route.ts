import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobAttachments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId || isNaN(parseInt(jobId))) {
      return NextResponse.json(
        { error: 'Valid job ID is required' },
        { status: 400 }
      );
    }

    // Fetch all attachments for this job
    const attachments = await db
      .select()
      .from(jobAttachments)
      .where(eq(jobAttachments.jobId, parseInt(jobId)))
      .orderBy(jobAttachments.createdAt)
      .all();

    return NextResponse.json(attachments, { status: 200 });
  } catch (error) {
    console.error('GET /api/files error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
