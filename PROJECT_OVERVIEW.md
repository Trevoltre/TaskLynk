# TaskLynk - Freelance Writing Platform

A comprehensive freelance writing marketplace platform connecting clients with professional academic writers, managed by administrators.

## 🎯 Platform Overview

TaskLynk is a three-sided marketplace platform featuring:
- **Clients**: Post writing jobs and receive quality work
- **Freelancers**: Browse jobs, place bids, and earn money
- **Admins**: Manage users, approve jobs, assign freelancers, and moderate the platform

## 🚀 Key Features

### Admin Features
- **User Management**: Approve/reject client and freelancer applications
- **Job Management**: Approve jobs, assign to freelancers, cancel orders
- **Payment Verification**: Confirm M-Pesa payments from clients
- **Message Moderation**: Review and approve messages before display
- **Dashboard Analytics**: Comprehensive statistics and platform overview
- **Performance Tracking**: Monitor user ratings and freelancer balances

### Client Features
- **Job Posting**: Create detailed job orders with:
  - Title and instructions
  - Work type (essay, research, assignment, presentation)
  - Pages/slides with automatic pricing (KSh 250/page, KSh 150/slide)
  - Deadline setting
- **Order Tracking**: Monitor job status through complete workflow
- **Work Review**: Preview completed work (with restrictions)
- **Revision Requests**: Request changes if needed
- **M-Pesa Payment**: Secure payment through Lipa Na M-Pesa
- **Download**: Access final documents after payment confirmation

### Freelancer Features
- **Job Discovery**: Browse admin-approved available jobs
- **Bid Placement**: Submit proposals for jobs
- **Order Management**: Track assigned jobs
- **Work Submission**: Upload completed work
- **Earnings Tracking**: Monitor balance and completed jobs
- **Revision Handling**: Respond to client revision requests

## 📋 Complete Workflow

### 1. User Registration & Approval
```
User registers → Account pending → Admin reviews → Approve/Reject
```
- Admin accounts are auto-approved
- Clients and freelancers need admin approval
- Rejected users cannot access the platform

### 2. Job Lifecycle
```
Client posts job → Admin approves → Freelancers bid → Admin assigns 
→ Freelancer works → Delivers work → Client reviews → Payment → Completed
```

**Detailed Status Flow:**
- **Pending**: Waiting for admin approval
- **Approved**: Admin approved, available for bids
- **Assigned**: Admin assigned to a freelancer
- **In Progress**: Freelancer actively working
- **Delivered**: Work submitted, awaiting client review
- **Revision**: Client requested changes
- **Completed**: Client approved, payment confirmed
- **Cancelled**: Admin cancelled the job

### 3. Payment Process
```
Client reviews work → Initiates M-Pesa payment → Submits transaction code 
→ Admin verifies → Payment confirmed → Balance credited to freelancer
```

## 👥 Pre-configured Admin Accounts

The following admin accounts are pre-seeded with auto-approval (password: `kemoda2025` for all):

1. topwriteessays@gmail.com
2. m.d.techpoint25@gmail.com
3. maguna956@gmail.com
4. tasklynk01@gmail.com
5. maxwellotieno11@gmail.com
6. ashleydothy3162@gmail.com

## 🧪 Test Accounts

For testing purposes, two accounts are also seeded:

- **Test Client**: 
  - Email: client@test.com
  - Password: client123
  - Status: Pending approval (requires admin to approve)

- **Test Freelancer**: 
  - Email: freelancer@test.com
  - Password: freelancer123
  - Status: Pending approval (requires admin to approve)

## 💰 Pricing Structure

- **Pages**: Minimum KSh 250 per page
- **Slides**: Minimum KSh 150 per slide
- **Minimum Order**: KSh 250

Examples:
- 3 pages = KSh 750
- 5 slides = KSh 750
- 2 pages + 3 slides = KSh 950

## 🔐 Security Features

- **Role-based Access Control**: Separate dashboards for each user type
- **Account Approval System**: Admin verification required
- **Message Moderation**: All messages reviewed before display
- **Payment Verification**: Admin confirms all M-Pesa transactions
- **Restricted Content**: Preview mode with copy restrictions before payment

## 📱 M-Pesa Integration

Payment details configured as:
- **Service**: Lipa Na M-Pesa - Pochi La Biashara
- **Phone**: 0701066845
- **Account Format**: TaskLynk-{JobID}

Clients submit M-Pesa transaction codes, which admins verify before confirming payments.

## 🛠️ Technical Stack

- **Frontend**: Next.js 15, React, TypeScript
- **UI**: Shadcn/UI, Tailwind CSS
- **Database**: Turso (LibSQL)
- **ORM**: Drizzle ORM
- **Authentication**: Custom JWT-less auth with localStorage
- **Styling**: Tailwind CSS v4

## 📊 Database Schema

### Core Tables:
1. **users**: User accounts with roles and approval status
2. **jobs**: Job postings with complete workflow states
3. **bids**: Freelancer bids on jobs
4. **payments**: M-Pesa payment records
5. **messages**: Inter-user communication with admin approval
6. **ratings**: Job ratings with automatic user rating calculation
7. **job_files**: File attachments for jobs

## 🎨 User Experience

### Client Journey
1. Register and wait for approval
2. Post a job with detailed requirements
3. Wait for admin approval
4. Admin assigns best freelancer
5. Track progress through dashboard
6. Review delivered work
7. Request revisions or approve
8. Pay via M-Pesa
9. Download final document

### Freelancer Journey
1. Register and wait for approval
2. Browse available jobs
3. Place bids on interesting jobs
4. Wait for admin assignment
5. Start working on assigned job
6. Upload completed work
7. Handle revision requests if any
8. Receive payment in balance
9. Build reputation through ratings

### Admin Journey
1. Auto-approved login
2. Review pending user applications
3. Approve/reject new users
4. Review and approve client job posts
5. Review freelancer bids
6. Assign jobs to best freelancers
7. Monitor job progress
8. Verify M-Pesa payments
9. Moderate messages
10. Assign ratings to users

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Database connection (Turso credentials in .env)

### Installation
```bash
npm install
# or
bun install
```

### Run Development Server
```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

### Test the Platform

1. **As Admin**:
   - Login with any admin account (password: kemoda2025)
   - Approve test client and freelancer accounts
   - Explore admin dashboard

2. **As Client**:
   - Login as client@test.com (after admin approval)
   - Post a new job
   - Wait for admin to approve and assign

3. **As Freelancer**:
   - Login as freelancer@test.com (after admin approval)
   - Browse available jobs
   - Place bids on jobs

## 📝 API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user

### Users
- GET `/api/users` - List users (with filters)
- PATCH `/api/users/[id]/approve` - Approve/reject user
- DELETE `/api/users/[id]/remove` - Remove user

### Jobs
- GET `/api/jobs` - List jobs (with filters)
- POST `/api/jobs` - Create job
- PATCH `/api/jobs/[id]/approve` - Approve job
- PATCH `/api/jobs/[id]/assign` - Assign to freelancer
- PATCH `/api/jobs/[id]/status` - Update status

### Bids
- GET `/api/bids` - List bids
- POST `/api/bids` - Create bid

### Payments
- GET `/api/payments` - List payments
- POST `/api/payments` - Create payment
- PATCH `/api/payments/[id]/confirm` - Confirm payment

### Messages
- GET `/api/messages` - List messages
- POST `/api/messages` - Send message
- PATCH `/api/messages/[id]/approve` - Approve message

### Analytics
- GET `/api/stats` - Dashboard statistics

## 🎯 Future Enhancements

- File upload to cloud storage (AWS S3/Cloudflare R2)
- Real-time notifications
- In-app messaging system
- Advanced search and filtering
- Automated M-Pesa API integration
- Email notifications
- PDF preview with watermark
- Advanced analytics and reporting
- Multi-currency support
- Dispute resolution system

## 📄 License

This is a demonstration project for a freelance writing marketplace platform.

## 🤝 Support

For questions or issues, please contact the development team.

---

**Built with ❤️ for connecting writers and clients**
