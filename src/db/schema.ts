import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// NEW: Accounts table for account-linked clients
export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountName: text('account_name').notNull().unique(),
  contactPerson: text('contact_person').notNull(),
  contactEmail: text('contact_email').notNull().unique(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Domain Management
export const domains = sqliteTable('domains', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  maxUsers: integer('max_users'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// User Management
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayId: text('display_id').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  approved: integer('approved', { mode: 'boolean' }).notNull().default(false),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  balance: real('balance').notNull().default(0),
  earned: real('earned').notNull().default(0),
  totalEarnings: real('total_earnings').notNull().default(0),
  rating: real('rating'),
  phone: text('phone').notNull(),
  status: text('status').notNull().default('active'),
  suspendedUntil: text('suspended_until'),
  suspensionReason: text('suspension_reason'),
  blacklistReason: text('blacklist_reason'),
  rejectedAt: text('rejected_at'),
  rejectionReason: text('rejection_reason'),
  totalEarned: real('total_earned').notNull().default(0),
  totalSpent: real('total_spent').notNull().default(0),
  completedJobs: integer('completed_jobs').notNull().default(0),
  completionRate: real('completion_rate'),
  profilePictureUrl: text('profile_picture_url'),
  lastLoginAt: text('last_login_at'),
  lastLoginIp: text('last_login_ip'),
  lastLoginDevice: text('last_login_device'),
  loginCount: integer('login_count').notNull().default(0),
  domainId: integer('domain_id').references(() => domains.id),
  accountId: integer('account_id').references(() => accounts.id),
  freelancerBadge: text('freelancer_badge'),
  clientTier: text('client_tier').default('basic'),
  clientPriority: text('client_priority').notNull().default('regular'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// User Statistics
export const userStats = sqliteTable('user_stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  totalJobsPosted: integer('total_jobs_posted').notNull().default(0),
  totalJobsCompleted: integer('total_jobs_completed').notNull().default(0),
  totalJobsCancelled: integer('total_jobs_cancelled').notNull().default(0),
  totalAmountEarned: real('total_amount_earned').notNull().default(0),
  totalAmountSpent: real('total_amount_spent').notNull().default(0),
  averageRating: real('average_rating'),
  totalRatings: integer('total_ratings').notNull().default(0),
  onTimeDelivery: integer('on_time_delivery').notNull().default(0),
  lateDelivery: integer('late_delivery').notNull().default(0),
  revisionsRequested: integer('revisions_requested').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Jobs Management
export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayId: text('display_id').notNull().unique(),
  orderNumber: text('order_number').notNull().unique(),
  clientId: integer('client_id').notNull().references(() => users.id),
  assignedFreelancerId: integer('assigned_freelancer_id').references(() => users.id),
  title: text('title').notNull(),
  instructions: text('instructions').notNull(),
  workType: text('work_type').notNull(),
  pages: integer('pages'),
  slides: integer('slides'),
  amount: real('amount').notNull(),
  deadline: text('deadline').notNull(),
  actualDeadline: text('actual_deadline').notNull(),
  freelancerDeadline: text('freelancer_deadline').notNull(),
  requestDraft: integer('request_draft', { mode: 'boolean' }).notNull().default(false),
  draftDelivered: integer('draft_delivered', { mode: 'boolean' }).notNull().default(false),
  status: text('status').notNull().default('pending'),
  adminApproved: integer('admin_approved', { mode: 'boolean' }).notNull().default(false),
  clientApproved: integer('client_approved', { mode: 'boolean' }).notNull().default(false),
  revisionRequested: integer('revision_requested', { mode: 'boolean' }).notNull().default(false),
  revisionNotes: text('revision_notes'),
  paymentConfirmed: integer('payment_confirmed', { mode: 'boolean' }).notNull().default(false),
  invoiceGenerated: integer('invoice_generated', { mode: 'boolean' }).notNull().default(false),
  clientRating: integer('client_rating'),
  writerRating: integer('writer_rating'),
  reviewComment: text('review_comment'),
  placementPriority: integer('placement_priority').notNull().default(0),
  urgencyMultiplier: real('urgency_multiplier').notNull().default(1.0),
  calculatedPrice: real('calculated_price'),
  isRealOrder: integer('is_real_order', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Bids
export const bids = sqliteTable('bids', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  freelancerId: integer('freelancer_id').notNull().references(() => users.id),
  message: text('message'),
  bidAmount: real('bid_amount').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull(),
});

// Payments
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  clientId: integer('client_id').notNull().references(() => users.id),
  freelancerId: integer('freelancer_id').references(() => users.id),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method').notNull().default('mpesa'),
  status: text('status').notNull().default('pending'),
  mpesaCode: text('mpesa_code'),
  phoneNumber: text('phone_number'),
  mpesaCheckoutRequestId: text('mpesa_checkout_request_id'),
  mpesaMerchantRequestId: text('mpesa_merchant_request_id'),
  mpesaReceiptNumber: text('mpesa_receipt_number'),
  mpesaTransactionDate: text('mpesa_transaction_date'),
  mpesaResultDesc: text('mpesa_result_desc'),
  paystackReference: text('paystack_reference'),
  confirmedByAdmin: integer('confirmed_by_admin', { mode: 'boolean' }).notNull().default(false),
  confirmedAt: text('confirmed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Notifications
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  jobId: integer('job_id').references(() => jobs.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

// Job Messages
export const jobMessages = sqliteTable('job_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  senderId: integer('sender_id').notNull().references(() => users.id),
  message: text('message').notNull(),
  messageType: text('message_type').notNull().default('text'),
  adminApproved: integer('admin_approved', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

// Ratings
export const ratings = sqliteTable('ratings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  ratedUserId: integer('rated_user_id').notNull().references(() => users.id),
  ratedByUserId: integer('rated_by_user_id').notNull().references(() => users.id),
  score: integer('score').notNull(),
  comment: text('comment'),
  createdAt: text('created_at').notNull(),
});

// Job Attachments
export const jobAttachments = sqliteTable('job_attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  uploadedBy: integer('uploaded_by').notNull().references(() => users.id),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: text('file_type').notNull(),
  uploadType: text('upload_type').notNull(),
  scheduledDeletionAt: text('scheduled_deletion_at'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull(),
});

// Invoices
export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  clientId: integer('client_id').notNull().references(() => users.id),
  freelancerId: integer('freelancer_id').references(() => users.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  amount: real('amount').notNull(),
  freelancerAmount: real('freelancer_amount').notNull(),
  adminCommission: real('admin_commission').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'),
  isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
  paidAt: text('paid_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Messages
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  senderId: integer('sender_id').notNull().references(() => users.id),
  receiverId: integer('receiver_id').notNull().references(() => users.id),
  jobId: integer('job_id').references(() => jobs.id),
  content: text('content').notNull(),
  fileUrl: text('file_url'),
  adminApproved: integer('admin_approved', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

// Revisions
export const revisions = sqliteTable('revisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  submittedBy: integer('submitted_by').notNull().references(() => users.id),
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: text('file_type').notNull(),
  revisionNotes: text('revision_notes'),
  status: text('status').notNull().default('pending_review'),
  sentToFreelancer: integer('sent_to_freelancer', { mode: 'boolean' }).notNull().default(false),
  approvedByAdmin: integer('approved_by_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Email Logs
export const emailLogs = sqliteTable('email_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sentBy: integer('sent_by').notNull().references(() => users.id),
  sentTo: text('sent_to').notNull(),
  recipientType: text('recipient_type').notNull(),
  recipientCount: integer('recipient_count').notNull(),
  fromEmail: text('from_email').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('sent'),
  failedRecipients: text('failed_recipients'),
  jobId: integer('job_id').references(() => jobs.id),
  createdAt: text('created_at').notNull(),
});

// Job Files
export const jobFiles = sqliteTable('job_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  uploadedBy: integer('uploaded_by').notNull().references(() => users.id),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: text('file_type').notNull(),
  uploadType: text('upload_type').notNull(),
  createdAt: text('created_at').notNull(),
});

// Email Verification Codes
export const emailVerificationCodes = sqliteTable('email_verification_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  email: text('email').notNull(),
  code: text('code').notNull(),
  expiresAt: text('expires_at').notNull(),
  used: integer('used', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

// Pending Registrations - Store user data before email verification
export const pendingRegistrations = sqliteTable('pending_registrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  phone: text('phone').notNull(),
  verificationCode: text('verification_code').notNull(),
  codeExpiresAt: text('code_expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

// Password Reset Tokens
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  token: text('token').notNull(),
  expiresAt: text('expires_at').notNull(),
  used: integer('used', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

// Payment Requests - New table for client payment request system
export const paymentRequests = sqliteTable('payment_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => users.id),
  amount: real('amount').notNull(),
  status: text('status').notNull().default('pending'),
  paymentMethod: text('payment_method'),
  phoneNumber: text('phone_number'),
  transactionReference: text('transaction_reference'),
  createdAt: text('created_at').notNull(),
  confirmedAt: text('confirmed_at'),
  confirmedBy: integer('confirmed_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
});

// Email Notifications - New table for tracking automated email notifications
export const emailNotifications = sqliteTable('email_notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  notificationType: text('notification_type').notNull(),
  sentTo: text('sent_to').notNull(),
  sentAt: text('sent_at').notNull(),
  status: text('status').notNull().default('sent'),
  createdAt: text('created_at').notNull(),
});