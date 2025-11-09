import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { revisions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        },
        { status: 400 }
      );
    }

    const revisionId = parseInt(id);

    // Check if revision exists
    const existingRevision = await db.select()
      .from(revisions)
      .where(eq(revisions.id, revisionId))
      .limit(1);

    if (existingRevision.length === 0) {
      return NextResponse.json(
        { 
          error: 'Revision not found',
          code: 'REVISION_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Update revision with admin approval
    const updatedRevision = await db.update(revisions)
      .set({
        approvedByAdmin: true,
        status: 'approved',
        updatedAt: new Date().toISOString()
      })
      .where(eq(revisions.id, revisionId))
      .returning();

    return NextResponse.json(updatedRevision[0], { status: 200 });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}