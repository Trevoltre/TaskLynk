import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobFiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const fileId = parseInt(id);

    // Query jobFiles table by ID
    const file = await db
      .select()
      .from(jobFiles)
      .where(eq(jobFiles.id, fileId))
      .limit(1);

    // Return 404 if file not found
    if (file.length === 0) {
      return NextResponse.json(
        {
          error: 'File not found',
          code: 'FILE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Return file record
    return NextResponse.json(file[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}