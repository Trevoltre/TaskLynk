import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, notifications, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const jobId = parseInt(id);

    const job = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json(
        {
          error: 'Job not found',
          code: 'JOB_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(job[0], { status: 200 });
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const jobId = parseInt(id);

    const existingJob = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json(
        {
          error: 'Job not found',
          code: 'JOB_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, instructions, workType, pages, slides, amount, deadline } = body;

    // Validate workType is a non-empty string if provided
    if (workType !== undefined && typeof workType !== 'string') {
      return NextResponse.json(
        {
          error: 'Work type must be a string',
          code: 'INVALID_WORK_TYPE',
        },
        { status: 400 }
      );
    }

    if (amount !== undefined) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return NextResponse.json(
          {
            error: 'Amount must be a positive number',
            code: 'INVALID_AMOUNT',
          },
          { status: 400 }
        );
      }
    }

    if (deadline !== undefined) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return NextResponse.json(
          {
            error: 'Deadline must be a valid ISO timestamp',
            code: 'INVALID_DEADLINE',
          },
          { status: 400 }
        );
      }
    }

    // Validate pages and slides
    if (pages !== undefined && pages !== null) {
      const pagesNum = parseInt(pages);
      if (isNaN(pagesNum) || pagesNum < 0) {
        return NextResponse.json(
          {
            error: 'Pages must be a non-negative number',
            code: 'INVALID_PAGES',
          },
          { status: 400 }
        );
      }
    }

    if (slides !== undefined && slides !== null) {
      const slidesNum = parseInt(slides);
      if (isNaN(slidesNum) || slidesNum < 0) {
        return NextResponse.json(
          {
            error: 'Slides must be a non-negative number',
            code: 'INVALID_SLIDES',
          },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (instructions !== undefined) updateData.instructions = instructions.trim();
    if (workType !== undefined) updateData.workType = workType;
    
    // Handle pages and slides - allow null values
    if (pages !== undefined) {
      updateData.pages = pages === null ? null : parseInt(pages);
    }
    if (slides !== undefined) {
      updateData.slides = slides === null ? null : parseInt(slides);
    }
    
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    
    // Handle deadline updates - update all three deadline fields
    if (deadline !== undefined) {
      const actualDeadlineDate = new Date(deadline);
      const timeDiff = actualDeadlineDate.getTime() - new Date().getTime();
      const freelancerTime = timeDiff * 0.6; // 60% of total time
      const freelancerDeadlineDate = new Date(Date.now() + freelancerTime);
      
      updateData.actualDeadline = actualDeadlineDate.toISOString();
      updateData.freelancerDeadline = freelancerDeadlineDate.toISOString();
      updateData.deadline = freelancerDeadlineDate.toISOString(); // Also update old deadline field for backwards compatibility
    }

    console.log('[PUT /api/jobs/[id]] Update data:', JSON.stringify(updateData, null, 2));

    const updatedJob = await db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.id, jobId))
      .returning();

    if (updatedJob.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to update job',
          code: 'UPDATE_FAILED',
        },
        { status: 500 }
      );
    }

    console.log('[PUT /api/jobs/[id]] Job updated successfully:', updatedJob[0].id);

    // NOTIFICATION SYSTEM: Notify all users associated with this order
    const job = updatedJob[0];
    const usersToNotify: number[] = [];
    
    // Add client (always notified)
    usersToNotify.push(job.clientId);
    
    // Add assigned freelancer if exists
    if (job.assignedFreelancerId) {
      usersToNotify.push(job.assignedFreelancerId);
    }
    
    // Add all admins
    const admins = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .all();
    
    admins.forEach(admin => {
      if (!usersToNotify.includes(admin.id)) {
        usersToNotify.push(admin.id);
      }
    });

    // Build change summary
    const changes: string[] = [];
    if (title !== undefined && title !== existingJob[0].title) {
      changes.push('title');
    }
    if (instructions !== undefined && instructions !== existingJob[0].instructions) {
      changes.push('instructions');
    }
    if (workType !== undefined && workType !== existingJob[0].workType) {
      changes.push('work type');
    }
    if (pages !== undefined && pages !== existingJob[0].pages) {
      changes.push('pages');
    }
    if (slides !== undefined && slides !== existingJob[0].slides) {
      changes.push('slides');
    }
    if (amount !== undefined && parseFloat(amount) !== existingJob[0].amount) {
      changes.push('amount');
    }
    if (deadline !== undefined) {
      changes.push('deadline');
    }

    // Create notifications for all users
    const changeSummary = changes.length > 0 
      ? `Updated: ${changes.join(', ')}` 
      : 'Order details updated';

    for (const userId of usersToNotify) {
      try {
        await db.insert(notifications).values({
          userId,
          jobId: job.id,
          type: 'order_updated',
          title: `Order ${job.displayId} Updated`,
          message: `Order "${job.title}" has been updated. ${changeSummary}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch (notifError) {
        console.error(`Failed to create notification for user ${userId}:`, notifError);
      }
    }

    return NextResponse.json(updatedJob[0], { status: 200 });
  } catch (error) {
    console.error('[PUT /api/jobs/[id]] Error details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('[PUT /api/jobs/[id]] Error stack:', errorStack);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const jobId = parseInt(id);

    const existingJob = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json(
        {
          error: 'Job not found',
          code: 'JOB_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const deletedJob = await db
      .delete(jobs)
      .where(eq(jobs.id, jobId))
      .returning();

    if (deletedJob.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to delete job',
          code: 'DELETE_FAILED',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Job deleted successfully',
        job: deletedJob[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}