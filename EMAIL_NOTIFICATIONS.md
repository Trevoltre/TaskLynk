# TaskLynk Email Notification System

## Overview

TaskLynk uses **Resend** to send automated email notifications to users for key platform activities. All email templates are professionally designed with responsive HTML and match the TaskLynk brand identity.

## Setup Instructions

### 1. Get Resend API Key

1. Go to [resend.com](https://resend.com) and create an account
2. Verify your domain or use the Resend test domain for development
3. Navigate to **API Keys** in your dashboard
4. Create a new API key
5. Copy the API key (starts with `re_`)

### 2. Add to Environment Variables

Add the following to your `.env` file:

```env
RESEND_API_KEY=re_your_api_key_here
```

### 3. Configure Sender Email

By default, emails are sent from `noreply@tasklynk.com`. To change this:

1. Open `src/lib/email.ts`
2. Update the `from` field in the `sendEmail` function:

```typescript
from: 'TaskLynk <your-email@your-domain.com>',
```

**Note:** For production, you must verify your domain with Resend.

## Email Notifications

### 1. Account Approval ✅

**Triggered when:** Admin approves a user account

**Recipients:** Newly approved user

**Subject:** `🎉 Your TaskLynk Account Has Been Approved!`

**Content:**
- Welcome message
- Account type (client/freelancer)
- Next steps based on role
- Call-to-action button to access dashboard

**API Endpoint:** `PATCH /api/users/[id]/approve`

---

### 2. Account Rejection ❌

**Triggered when:** Admin rejects a user account

**Recipients:** Rejected user

**Subject:** `TaskLynk Account Application Update`

**Content:**
- Professional rejection notice
- Contact information for inquiries
- Support email and phone numbers

**API Endpoint:** `PATCH /api/users/[id]/approve`

---

### 3. Job Assignment 📝

**Triggered when:** Admin assigns a job to a freelancer

**Recipients:** Assigned freelancer

**Subject:** `🎉 New Job Assigned to You on TaskLynk!`

**Content:**
- Job details (title, ID, deadline, payment)
- Call-to-action button to view job
- Action required notice

**API Endpoint:** `PATCH /api/jobs/[id]/assign`

---

### 4. Work Delivered 📄

**Triggered when:** Freelancer submits completed work

**Recipients:** Job client

**Subject:** `📄 Work Delivered on TaskLynk!`

**Content:**
- Notification that work has been submitted
- Freelancer name
- Next steps (review, payment, approval)
- Preview limitation notice (40%)
- Call-to-action button to review work

**API Endpoint:** `PATCH /api/jobs/[id]/status` (status: "delivered")

---

### 5. Payment Confirmed 💰

**Triggered when:** Admin confirms M-Pesa payment

**Recipients:** Freelancer who completed the job

**Subject:** `💰 Payment Received on TaskLynk!`

**Content:**
- Job title
- Amount earned
- New account balance
- Encouragement message
- Call-to-action button to view dashboard

**API Endpoint:** `PATCH /api/payments/[id]/confirm`

**Additional Actions:**
- Updates freelancer's account balance
- Releases payment to freelancer

---

### 6. Revision Requested 🔄

**Triggered when:** Client requests revisions on delivered work

**Recipients:** Freelancer who submitted the work

**Subject:** `🔄 Revision Requested on TaskLynk`

**Content:**
- Client's revision feedback
- Job details
- Steps to submit revision
- Call-to-action button to view job

**API Endpoint:** `POST /api/jobs/[id]/revision`

---

## Email Template Design

All email templates follow these design principles:

### Visual Design
- **Brand Colors:** Blue gradient (#2563eb → #4f46e5)
- **Typography:** System fonts for maximum compatibility
- **Layout:** Centered, 600px max-width, responsive
- **Icons:** Emoji-based for universal support
- **Spacing:** Generous padding for readability

### Components
1. **Header:** TaskLynk logo with gradient background
2. **Icon Badge:** Circular badge with relevant emoji
3. **Title:** Clear, action-oriented heading
4. **Body:** Personalized message with user's name
5. **Details Section:** Highlighted information boxes
6. **CTA Button:** Prominent gradient button
7. **Footer:** Contact information and branding

### Accessibility
- Semantic HTML structure
- High contrast text
- Alt text for images
- Mobile-responsive tables
- Clear call-to-action buttons

## Testing Email Notifications

### Development Testing

1. **Use Resend Test Mode:**
   - Resend provides a test domain for development
   - Emails are sent but not delivered to real inboxes
   - View emails in Resend dashboard

2. **Test with Real Email:**
   - Use your own email for testing
   - Verify all email types render correctly
   - Check on multiple email clients (Gmail, Outlook, Apple Mail)

### Testing Checklist

- [ ] Account approval email sends correctly
- [ ] Account rejection email sends correctly
- [ ] Job assignment email includes correct details
- [ ] Work delivery email sent to correct client
- [ ] Payment confirmation updates balance
- [ ] Revision request includes client feedback
- [ ] All CTAs link to correct pages
- [ ] Emails render on mobile devices
- [ ] Emails render in Gmail, Outlook, Apple Mail

## Error Handling

Email sending is **non-blocking**:
- If email fails, the main operation still succeeds
- Errors are logged to console for debugging
- Users are not notified of email delivery failures

Example error handling:
```typescript
try {
  await sendEmail({ to, subject, html });
} catch (emailError) {
  console.error('Failed to send email notification:', emailError);
  // Operation continues regardless
}
```

## Production Considerations

### 1. Domain Verification
- Verify your domain with Resend for production
- Update sender email from default
- Configure SPF, DKIM, and DMARC records

### 2. Rate Limits
- Resend free tier: 3,000 emails/month
- Pro tier: 50,000 emails/month
- Enterprise: Custom limits

### 3. Monitoring
- Monitor email delivery rates in Resend dashboard
- Set up webhooks for delivery/bounce notifications
- Track open rates and engagement

### 4. Compliance
- Include unsubscribe links for marketing emails
- Follow GDPR/CCPA regulations
- Store user email preferences

### 5. Email Queue (Optional)
For high-volume scenarios, consider:
- Background job processing (Bull, BullMQ)
- Email queue system
- Batch sending for bulk operations

## Customization

### Adding New Email Templates

1. **Create HTML Template** in `src/lib/email.ts`:

```typescript
export function getYourEmailHTML(params): string {
  return `
    <!DOCTYPE html>
    <html>
      <!-- Your email HTML -->
    </html>
  `;
}
```

2. **Integrate into API Endpoint**:

```typescript
import { sendEmail, getYourEmailHTML } from '@/lib/email';

await sendEmail({
  to: user.email,
  subject: 'Your Subject',
  html: getYourEmailHTML(param1, param2),
});
```

### Modifying Existing Templates

Edit the template functions in `src/lib/email.ts`:
- Update HTML structure
- Change colors, fonts, spacing
- Add/remove sections
- Update copy/messaging

## Support

For issues with email notifications:
- Check Resend dashboard for delivery status
- Verify API key is correct in `.env`
- Check console logs for error messages
- Ensure sender domain is verified (production)

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Email HTML Best Practices](https://www.emailonacid.com/)
- [TaskLynk Support](mailto:tasklynk01@gmail.com)
