import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, bids, users } from '@/db/schema';
import { eq, and, desc, notInArray, sql } from 'drizzle-orm';
import { generateJobDisplayId } from '@/app/api/utils/generate-display-id/route';
import { sendEmailToAdmins, getNewJobPostingAdminHTML } from '@/lib/email';

const VALID_WORK_TYPES = [
  'essay',
  'research',
  'assignment',
  'presentation',
  'Essay',
  'Assignment',
  'Research Proposal',
  'Thesis Writing',
  'Research Paper',
  'Presentation',
  'PowerPoint Design',
  'Slide Design',
  'Dissertation',
  'Case Study',
  'Lab Report',
  'Article Writing',
  'Blog Writing',
  'Grammar & Proofreading',
  'AI Content Removal',
  'Humanization',
  'Plagiarism + AI Detection Report',
  'Formatting & Referencing',
  'PDF Editing',
  'Document Conversion',
  'File Compression',
  'Data Analysis',
  'SPSS',
  'Excel',
  'R Programming',
  'Python',
  'STATA',
  'JASP',
  'JAMOVI',
  'Infographics',
  'Data Visualization',
  'Poster Design',
  'Resume Design',
  'Brochure Design',
  'Fast Delivery',
  'Revision Support',
  'Expert Consultation',
  'Tutoring',
  'Other'
] as const;
const VALID_STATUSES = ['pending', 'approved', 'assigned', 'in_progress', 'delivered', 'revision', 'completed', 'cancelled'] as const;

// Helper function to calculate minimum amount based on work type
function calculateMinimumAmount(workType: string, pages: number | null, slides: number | null): number {
  // Base minimum amounts for different work types
  const baseAmounts: Record<string, number> = {
    'essay': 10,
    'research': 25,
    'assignment': 15,
    'presentation': 30,
    'PowerPoint Design': 50,
    'Slide Design': 40,
    'Dissertation': 100,
    'Case Study': 50,
    'Lab Report': 30,
    'Article Writing': 20,
    'Blog Writing': 15,
    'Grammar & Proofreading': 5,
    'AI Content Removal': 10,
    'Humanization': 15,
    'Plagiarism + AI Detection Report': 20,
    'Formatting & Referencing': 10,
    'PDF Editing': 15,
    'Document Conversion': 25,
    'File Compression': 5,
    'Data Analysis': 50,
    'SPSS': 30,
    'Excel': 20,
    'R Programming': 40,
    'Python': 35,
    'STATA': 30,
    'JASP': 25,
    'JAMOVI': 20,
    'Infographics': 40,
    'Data Visualization': 35,
    'Poster Design': 30,
    'Resume Design': 25,
    'Brochure Design': 35,
    'Fast Delivery': 10,
    'Revision Support': 5,
    'Expert Consultation': 100,
    'Tutoring': 20
  };

  // Default to base amount if work type not found
  const baseAmount = baseAmounts[workType] || 10;

  // Adjust for pages and slides
  let adjustedAmount = baseAmount;
  
  if (pages !== null) {
    adjustedAmount += pages * 2;
  }
  
  if (slides !== null) {
    adjustedAmount += slides * 5;
  }

  return adjustedAmount;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const assignedFreelancerId = searchParams.get('assignedFreelancerId');
    const status = searchParams.get('status');
    const excludeFreelancerBids = searchParams.get('excludeFreelancerBids');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Build query conditions
    const conditions = [];

    if (clientId) {
      const parsedClientId = parseInt(clientId);
      if (isNaN(parsedClientId)) {
        return NextResponse.json({ 
          error: 'Invalid clientId parameter',
          code: 'INVALID_CLIENT_ID' 
        }, { status: 400 });
      }
      conditions.push(eq(jobs.clientId, parsedClientId));
    }

    if (assignedFreelancerId) {
      const parsedFreelancerId = parseInt(assignedFreelancerId);
      if (isNaN(parsedFreelancerId)) {
        return NextResponse.json({ 
          error: 'Invalid assignedFreelancerId parameter',
          code: 'INVALID_FREELANCER_ID' 
        }, { status: 400 });
      }
      conditions.push(eq(jobs.assignedFreelancerId, parsedFreelancerId));
    }

    if (status) {
      if (!VALID_STATUSES.includes(status as any)) {
        return NextResponse.json({ 
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS' 
        }, { status: 400 });
      }
      conditions.push(eq(jobs.status, status));
    }

    // Handle excludeFreelancerBids parameter
    if (excludeFreelancerBids) {
      const parsedFreelancerId = parseInt(excludeFreelancerBids);
      if (isNaN(parsedFreelancerId)) {
        return NextResponse.json({ 
          error: 'Invalid excludeFreelancerBids parameter',
          code: 'INVALID_EXCLUDE_FREELANCER_BIDS' 
        }, { status: 400 });
      }

      // Get all job IDs where this freelancer has placed a bid
      const freelancerBids = await db
        .select({ jobId: bids.jobId })
        .from(bids)
        .where(eq(bids.freelancerId, parsedFreelancerId));

      const jobIdsWithBids = freelancerBids.map(bid => bid.jobId);

      // If freelancer has placed bids, exclude those jobs
      if (jobIdsWithBids.length > 0) {
        conditions.push(notInArray(jobs.id, jobIdsWithBids));
      }
    }

    // Fetch jobs with client information using LEFT JOIN
    let query = db
      .select({
        id: jobs.id,
        displayId: jobs.displayId,
        orderNumber: jobs.orderNumber,
        clientId: jobs.clientId,
        clientName: users.name,
        title: jobs.title,
        instructions: jobs.instructions,
        workType: jobs.workType,
        pages: jobs.pages,
        slides: jobs.slides,
        amount: jobs.amount,
        deadline: jobs.deadline,
        status: jobs.status,
        assignedFreelancerId: jobs.assignedFreelancerId,
        adminApproved: jobs.adminApproved,
        clientApproved: jobs.clientApproved,
        revisionRequested: jobs.revisionRequested,
        revisionNotes: jobs.revisionNotes,
        paymentConfirmed: jobs.paymentConfirmed,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .leftJoin(users, eq(jobs.clientId, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    // Return with aggressive cache-busting headers for real-time updates
    return NextResponse.json(results, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, title, instructions, workType, pages, slides, amount, deadline, actualDeadline, freelancerDeadline, requestDraft } = body;

    // Validation: Required fields
    if (!clientId) {
      return NextResponse.json({ 
        error: 'clientId is required',
        code: 'MISSING_CLIENT_ID' 
      }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ 
        error: 'title is required and must be a non-empty string',
        code: 'INVALID_TITLE' 
      }, { status: 400 });
    }

    if (!instructions || typeof instructions !== 'string' || instructions.trim() === '') {
      return NextResponse.json({ 
        error: 'instructions is required and must be a non-empty string',
        code: 'INVALID_INSTRUCTIONS' 
      }, { status: 400 });
    }

    if (!workType || !VALID_WORK_TYPES.includes(workType)) {
      return NextResponse.json({ 
        error: `workType is required and must be one of: ${VALID_WORK_TYPES.join(', ')}`,
        code: 'INVALID_WORK_TYPE' 
      }, { status: 400 });
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json({ 
        error: 'amount is required',
        code: 'MISSING_AMOUNT' 
      }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ 
        error: 'amount must be a positive number',
        code: 'INVALID_AMOUNT' 
      }, { status: 400 });
    }

    // Validate minimum amount based on workType
    const calculatedMinAmount = calculateMinimumAmount(workType, pages, slides);
    if (parsedAmount < calculatedMinAmount) {
      return NextResponse.json({ 
        error: `Amount (${parsedAmount}) cannot be less than the computed minimum price (${calculatedMinAmount}) based on the job type selected.`,
        code: 'AMOUNT_BELOW_MINIMUM',
        minimumAmount: calculatedMinAmount
      }, { status: 400 });
    }

    if (!deadline) {
      return NextResponse.json({ 
        error: 'deadline is required',
        code: 'MISSING_DEADLINE' 
      }, { status: 400 });
    }

    // Validate deadline is a valid ISO timestamp
    const parsedDeadlineDate = new Date(deadline);
    if (isNaN(parsedDeadlineDate.getTime())) {
      return NextResponse.json({ 
        error: 'deadline must be a valid ISO timestamp',
        code: 'INVALID_DEADLINE' 
      }, { status: 400 });
    }

    // Validate clientId is a valid integer
    const parsedClientId = parseInt(clientId);
    if (isNaN(parsedClientId)) {
      return NextResponse.json({ 
        error: 'clientId must be a valid integer',
        code: 'INVALID_CLIENT_ID' 
      }, { status: 400 });
    }

    // Validate optional pages field
    let parsedPages = null;
    if (pages !== undefined && pages !== null) {
      parsedPages = parseInt(pages);
      if (isNaN(parsedPages) || parsedPages < 0) {
        return NextResponse.json({ 
          error: 'pages must be a non-negative integer',
          code: 'INVALID_PAGES' 
        }, { status: 400 });
      }
    }

    // Validate optional slides field
    let parsedSlides = null;
    if (slides !== undefined && slides !== null) {
      parsedSlides = parseInt(slides);
      if (isNaN(parsedSlides) || parsedSlides < 0) {
        return NextResponse.json({ 
          error: 'slides must be a non-negative integer',
          code: 'INVALID_SLIDES' 
        }, { status: 400 });
      }
    }

    const now = new Date().toISOString();

    // Generate display ID for the job
    const displayId = await generateJobDisplayId();

    // Fetch client to determine account and name for order number generation
    const clientRows = await db.select().from(users).where(eq(users.id, parsedClientId)).limit(1);
    if (clientRows.length === 0) {
      return NextResponse.json({ 
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND' 
      }, { status: 404 });
    }
    const client = clientRows[0];

    // Generate order number per rules
    let orderNumber = '';
    if (client.accountId) {
      // Count existing orders for this account (based on client users linked to the same account)
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(jobs)
        .leftJoin(users, eq(jobs.clientId, users.id))
        .where(eq(users.accountId, client.accountId));
      const existingCount = countResult[0]?.count || 0;
      orderNumber = `ORD-ACC-${String(existingCount + 1).padStart(5, '0')}`;
    } else {
      // Use client's first name; ensure uniqueness by appending numeric suffix when necessary
      const firstName = (client.name || 'Client').trim().split(/\s+/)[0] || 'Client';
      const base = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
      orderNumber = base;
      let suffix = 1;
      // Attempt until unique
      // Note: small chance of race condition under extreme concurrency; acceptable for current scope
      // Keep attempts bounded
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const exists = await db
          .select({ id: jobs.id })
          .from(jobs)
          .where(eq(jobs.orderNumber, orderNumber))
          .limit(1);
        if (exists.length === 0) break;
        suffix += 1;
        orderNumber = `${base}-${suffix}`;
        if (suffix > 9999) break;
      }
    }

    // Calculate urgency multiplier based on deadline
    const currentTime = new Date();
    const hoursUntilDeadline = (parsedDeadlineDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    const urgencyMultiplier = hoursUntilDeadline < 8 ? 1.3 : 1.0;
    const calculatedPrice = parsedAmount * urgencyMultiplier;

    // Prepare insert data - DO NOT include 'id' field, let database auto-generate it
    const insertData = {
      displayId,
      orderNumber,
      clientId: parsedClientId,
      title: title.trim(),
      instructions: instructions.trim(),
      workType,
      pages: parsedPages,
      slides: parsedSlides,
      amount: parsedAmount,
      deadline: parsedDeadlineDate.toISOString(),
      actualDeadline: actualDeadline || parsedDeadlineDate.toISOString(),
      freelancerDeadline: freelancerDeadline || parsedDeadlineDate.toISOString(),
      requestDraft: requestDraft ? true : false,
      draftDelivered: false,
      status: 'pending',
      adminApproved: false,
      clientApproved: false,
      revisionRequested: false,
      paymentConfirmed: false,
      placementPriority: 0,
      urgencyMultiplier: urgencyMultiplier,
      calculatedPrice: calculatedPrice,
      isRealOrder: true,
      createdAt: now,
      updatedAt: now,
    };

    let newJob;
    try {
      newJob = await db.insert(jobs)
        .values(insertData)
        .returning();
    } catch (e: any) {
      // Handle possible unique constraint violations for order number
      const message = (e?.message || '').toLowerCase();
      if (message.includes('unique') && message.includes('order_number')) {
        return NextResponse.json({
          error: 'Generated order number already exists. Please retry.',
          code: 'ORDER_NUMBER_CONFLICT'
        }, { status: 409 });
      }
      throw e;
    }

    // Send notification to admins (don't wait for it)
    try {
      sendEmailToAdmins({
        subject: `New Job Posted - ${title}`,
        html: getNewJobPostingAdminHTML(
          client.name,
          client.email,
          title.trim(),
          newJob[0].id,
          displayId,
          workType,
          parsedAmount,
          parsedDeadlineDate.toISOString()
        )
      }).catch(err => console.error('Failed to send admin notification:', err));
    } catch (err) {
      console.error('Admin email dispatch error:', err);
    }

    return NextResponse.json(newJob[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}