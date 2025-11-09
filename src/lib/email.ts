import nodemailer from 'nodemailer';

// HostAfrica SMTP Configuration
const transporter = nodemailer.createTransport({
  host: 'mail.tasklynk.co.ke',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: 'admn@tasklynk.co.ke',
    pass: 'Kemoda@2039'
  },
  tls: {
    rejectUnauthorized: false // For self-signed certificates
  }
});

// Admin email addresses
export const ADMIN_EMAILS = [
  'topwriteessays@gmail.com',
  'm.d.techpoint25@gmail.com',
  'maguna956@gmail.com',
  'tasklynk01@gmail.com',
  'maxwellotieno11@gmail.com',
  'ashleydothy3162@gmail.com'
];

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection failed:', error);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    // Always use admn@tasklynk.co.ke as sender
    const info = await transporter.sendMail({
      from: 'TaskLynk <admn@tasklynk.co.ke>',
      to,
      subject,
      html,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error };
  }
}

// Send email to all admins
export async function sendEmailToAdmins({
  subject,
  html,
}: {
  subject: string;
  html: string;
}) {
  try {
    const results = await Promise.allSettled(
      ADMIN_EMAILS.map(email => sendEmail({ to: email, subject, html }))
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Admin emails sent: ${successCount}/${ADMIN_EMAILS.length}`);
    
    return { success: true, successCount, totalCount: ADMIN_EMAILS.length };
  } catch (error) {
    console.error('❌ Failed to send emails to admins:', error);
    return { success: false, error };
  }
}

// Email header template with logo and branding - Professional Plain Text
function getEmailHeader(): string {
  return `
    <tr>
      <td style="background: linear-gradient(135deg, #1D3557 0%, #457B9D 100%); padding: 40px 30px; text-align: center;">
        <div style="margin-bottom: 15px;">
          <img src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/Revised-logo-1761824652421.png?width=800&height=800&resize=contain" alt="TaskLynk Logo" style="height: 50px; width: auto;" onerror="this.style.display='none'">
        </div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">TaskLynk Academic</h1>
        <p style="margin: 10px 0 0; color: #F2A541; font-size: 16px;">Professional Academic Writing Platform</p>
      </td>
    </tr>
  `;
}

// Email footer template
function getEmailFooter(): string {
  return `
    <tr>
      <td style="background-color: #f9fafb; padding: 30px; text-center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
          © 2025 TaskLynk Academic. All rights reserved.
        </p>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Nairobi, Kenya | admn@tasklynk.co.ke | +254701066845
        </p>
        <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
          <a href="https://tasklynk.co.ke" style="color: #1D3557; text-decoration: none;">Visit Website</a>
        </p>
      </td>
    </tr>
  `;
}

// Admin notification: New user registration
export function getNewUserRegistrationAdminHTML(
  userName: string,
  userEmail: string,
  userRole: string,
  userPhone: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New User Registration - TaskLynk Admin</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="display: inline-block; width: 80px; height: 80px; background-color: #3b82f6; border-radius: 50%; text-align: center; line-height: 80px;">
                        <span style="font-size: 40px; color: #ffffff;">👤</span>
                      </div>
                    </div>
                    
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">New User Registration</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello Admin,
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      A new user has registered on TaskLynk Academic and is awaiting approval.
                    </p>
                    
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
                      <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">User Details</h3>
                      <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 15px;">
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Name:</strong></td>
                          <td style="color: #1f2937; padding: 8px 0;">${userName}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Email:</strong></td>
                          <td style="color: #1f2937; padding: 8px 0;">${userEmail}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Phone:</strong></td>
                          <td style="color: #1f2937; padding: 8px 0;">${userPhone}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Role:</strong></td>
                          <td style="color: #1f2937; padding: 8px 0; text-transform: capitalize;">${userRole}</td>
                        </tr>
                      </table>
                    </div>
                    
                    <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
                      <p style="margin: 0; color: #1e40af; font-size: 15px; line-height: 1.6;">
                        <strong>Action Required:</strong> Please log in to the admin dashboard to review and approve/reject this registration.
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://tasklynk.co.ke/admin/users" style="display: inline-block; background: linear-gradient(135deg, #1D3557 0%, #457B9D 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        View Pending Registrations
                      </a>
                    </div>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// Admin notification: New job posting
export function getNewJobPostingAdminHTML(
  clientName: string,
  clientEmail: string,
  jobTitle: string,
  jobId: number,
  displayId: string,
  workType: string,
  amount: number,
  deadline: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Job Posted - TaskLynk Admin</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="display: inline-block; width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; text-align: center; line-height: 80px;">
                        <span style="font-size: 40px; color: #ffffff;">📝</span>
                      </div>
                    </div>
                    
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">New Job Posted</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello Admin,
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      A new job has been posted on TaskLynk Academic and requires your approval.
                    </p>
                    
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
                      <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">Job Details</h3>
                      <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 15px;">
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Job ID:</strong></td>
                          <td style="color: #1f2937; padding: 8px 0; font-family: monospace;">${displayId}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Title:</strong></td>
                          <td style="color: #1f2937; padding: 8px 0;">${jobTitle}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Work Type:</strong></td>
                          <td style="color: #1f2937; padding: 8px 0;">${workType}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Amount:</strong></td>
                          <td style="color: #10b981; padding: 8px 0; font-weight: bold;">KSh ${amount.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Deadline:</strong></td>
                          <td style="color: #1f2937; padding: 8px 0;">${new Date(deadline).toLocaleString()}</td>
                        </tr>
                      </table>
                      
                      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <h4 style="margin: 0 0 10px; color: #1f2937; font-size: 16px;">Client Information</h4>
                        <p style="margin: 5px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong> ${clientName}</p>
                        <p style="margin: 5px 0; color: #4b5563; font-size: 14px;"><strong>Email:</strong> ${clientEmail}</p>
                      </div>
                    </div>
                    
                    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                      <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6;">
                        <strong>Action Required:</strong> Please review and approve this job to make it visible to freelancers.
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://tasklynk.co.ke/admin/jobs/${jobId}" style="display: inline-block; background: linear-gradient(135deg, #1D3557 0%, #457B9D 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Review Job
                      </a>
                    </div>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// 1. Account Registration Received
export function getAccountRegistrationReceivedHTML(userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TaskLynk Academic — Registration Received</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Welcome to TaskLynk Academic — Registration Received</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello ${userName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Thank you for registering with TaskLynk Academic.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Your application has been received successfully and is currently under review by our team.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You will receive an account approval update within 7 business days.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      In the meantime, feel free to explore your dashboard and update your profile details.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      We appreciate your interest in joining our academic network!
                    </p>
                    
                    <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Best regards,<br>
                      TaskLynk Academic Team<br>
                      admn@tasklynk.co.ke
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// 2. Account Approved
export function getAccountApprovedEmailHTML(userName: string, userRole: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your TaskLynk Academic Account Has Been Approved</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Your TaskLynk Academic Account Has Been Approved</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello ${userName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Congratulations! Your TaskLynk Academic account has been successfully approved.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You can now log in, explore available orders, and begin working or posting tasks right away.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://tasklynk.co.ke/login" style="display: inline-block; background: linear-gradient(135deg, #1D3557 0%, #457B9D 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Login Here
                      </a>
                    </div>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      We're excited to have you on board!
                    </p>
                    
                    <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Warm regards,<br>
                      TaskLynk Academic Admin<br>
                      admn@tasklynk.co.ke
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// 3. Order Assigned
export function getJobAssignedEmailHTML(
  freelancerName: string,
  orderId: string,
  jobTitle: string,
  deadline: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order #${orderId} — Assigned to You</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Order #${orderId} — Assigned to You</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello ${freelancerName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Good news! You've been assigned to a new order.
                    </p>
                    
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
                      <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">Order Details</h3>
                      <p style="margin: 5px 0; color: #4b5563; font-size: 15px;"><strong>Order ID:</strong> #${orderId}</p>
                      <p style="margin: 5px 0; color: #4b5563; font-size: 15px;"><strong>Title:</strong> ${jobTitle}</p>
                      <p style="margin: 5px 0; color: #4b5563; font-size: 15px;"><strong>Deadline:</strong> ${deadline}</p>
                    </div>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Please review the order requirements carefully and begin working as soon as possible.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You can track progress or communicate with the client from your dashboard.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://tasklynk.co.ke/orders" style="display: inline-block; background: linear-gradient(135deg, #1D3557 0%, #457B9D 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Login to Your Dashboard
                      </a>
                    </div>
                    
                    <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Best,<br>
                      TaskLynk Academic Support
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// 4. Revision Required
export function getRevisionRequestedEmailHTML(
  freelancerName: string,
  orderId: string,
  revisionMessage: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order #${orderId} — Revision Requested</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Order #${orderId} — Revision Requested</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello ${freelancerName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      The client has requested a revision for your submitted work on Order #${orderId}.
                    </p>
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                      <h3 style="margin: 0 0 10px; color: #92400e; font-size: 16px;">Client Feedback:</h3>
                      <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.6;">
                        ${revisionMessage}
                      </p>
                    </div>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Please review the client's comments and re-upload the revised file as soon as possible.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You can view the revision notes in your order dashboard.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Ensure all revisions meet TaskLynk's quality and originality standards.
                    </p>
                    
                    <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Thank you,<br>
                      TaskLynk Academic Quality Team
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function getAccountRejectedEmailHTML(userName: string, userRole: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Status Update - TaskLynk</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Account Application Update</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Dear ${userName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Thank you for your interest in joining TaskLynk as a ${userRole}. After careful review, we regret to inform you that we cannot approve your account at this time.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      This decision was made to maintain the quality standards of our platform. If you believe this was a mistake or would like to discuss this further, please contact our support team.
                    </p>
                    
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
                      <p style="margin: 0; color: #991b1b; font-size: 15px; line-height: 1.6;">
                        <strong>Important:</strong> You will no longer have access to your account. Please contact support if you need more information.
                      </p>
                    </div>
                    
                    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      For inquiries, contact us at 
                      <a href="mailto:admn@tasklynk.co.ke" style="color: #1D3557; text-decoration: none;">admn@tasklynk.co.ke</a> 
                      or +254701066845.
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function getAccountSuspendedEmailHTML(userName: string, reason: string, suspendedUntil: string | null): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Suspended - TaskLynk</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Account Suspended</h2>
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Dear ${userName},
                    </p>
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Your TaskLynk account has been temporarily suspended.
                    </p>
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
                      <p style="margin: 0 0 10px; color: #991b1b; font-size: 15px;"><strong>Reason:</strong> ${reason}</p>
                      ${suspendedUntil ? `<p style="margin: 0; color: #991b1b; font-size: 15px;"><strong>Until:</strong> ${new Date(suspendedUntil).toLocaleDateString()}</p>` : '<p style="margin: 0; color: #991b1b; font-size: 15px;"><strong>Duration:</strong> Indefinite</p>'}
                    </div>
                    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      Contact support at <a href="mailto:admn@tasklynk.co.ke" style="color: #1D3557; text-decoration: none;">admn@tasklynk.co.ke</a>
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function getAccountUnsuspendedEmailHTML(userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Reactivated - TaskLynk</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Account Reactivated!</h2>
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Dear ${userName},
                    </p>
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Good news! Your account suspension has been lifted and you now have full access to TaskLynk.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://tasklynk.co.ke/login" style="display: inline-block; background: linear-gradient(135deg, #1D3557 0%, #457B9D 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Access Your Dashboard
                      </a>
                    </div>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function getWorkDeliveredEmailHTML(
  clientName: string,
  jobTitle: string,
  jobId: number,
  displayId: string,
  freelancerName: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order ${displayId} — Work Delivered</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="display: inline-block; width: 80px; height: 80px; background-color: #8b5cf6; border-radius: 50%; text-align: center; line-height: 80px;">
                        <span style="font-size: 40px; color: #ffffff;">✓</span>
                      </div>
                    </div>
                    
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Order ${displayId} — Work Delivered!</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hi ${clientName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Great news! ${freelancerName} has completed and submitted the work for your job "${jobTitle}". The work is now awaiting your review.
                    </p>
                    
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
                      <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">Next Steps</h3>
                      <p style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 15px; line-height: 1.8;">
                        1. Review the delivered work (40% preview available)<br>
                        2. Check for quality and completeness<br>
                        3. Request revision if needed (free)<br>
                        4. Complete payment via M-Pesa to download full files<br>
                        5. Approve the work to release payment to freelancer
                      </p>
                    </div>
                    
                    <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
                      <p style="margin: 0; color: #1e40af; font-size: 15px; line-height: 1.6;">
                        <strong>Tip:</strong> Review the work carefully before approving. You can request one free revision if needed.
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://tasklynk.co.ke/client/jobs/${jobId}" style="display: inline-block; background: linear-gradient(135deg, #1D3557 0%, #457B9D 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Review Delivered Work
                      </a>
                    </div>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function getPaymentConfirmedEmailHTML(
  freelancerName: string,
  jobTitle: string,
  displayId: string,
  amount: number,
  newBalance: number
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order ${displayId} — Payment Received</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="display: inline-block; width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; text-align: center; line-height: 80px;">
                        <span style="font-size: 40px; color: #ffffff;">✓</span>
                      </div>
                    </div>
                    
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Order ${displayId} — Payment Received!</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hi ${freelancerName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Congratulations! Payment for your completed job "${jobTitle}" has been confirmed and added to your balance.
                    </p>
                    
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
                      <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">Payment Details</h3>
                      <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 15px;">
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Order ID:</strong></td>
                          <td style="color: #1f2937; padding: 8px 0; font-family: monospace;">${displayId}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Job:</strong></td>
                          <td style="color: #1f2937; padding: 8px 0;">${jobTitle}</td>
                        </tr>
                        <tr>
                          <td style="color: #6b7280; padding: 8px 0;"><strong>Amount Earned:</strong></td>
                          <td style="color: #10b981; padding: 8px 0; font-weight: bold;">KSh ${amount.toFixed(2)}</td>
                        </tr>
                        <tr style="border-top: 2px solid #e5e7eb;">
                          <td style="color: #6b7280; padding: 12px 0;"><strong>New Balance:</strong></td>
                          <td style="color: #059669; padding: 12px 0; font-size: 18px; font-weight: bold;">KSh ${newBalance.toFixed(2)}</td>
                        </tr>
                      </table>
                    </div>
                    
                    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                      <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6;">
                        <strong>Well done!</strong> Keep up the excellent work. More jobs are available for you to bid on.
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://tasklynk.co.ke/freelancer/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1D3557 0%, #457B9D 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        View Dashboard
                      </a>
                    </div>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function getPasswordResetEmailHTML(userName: string, resetToken: string): string {
  const resetUrl = `https://tasklynk.co.ke/reset-password?token=${resetToken}`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - TaskLynk</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="display: inline-block; width: 80px; height: 80px; background-color: #F2A541; border-radius: 50%; text-align: center; line-height: 80px;">
                        <span style="font-size: 40px;">🔐</span>
                      </div>
                    </div>
                    
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Password Reset Request</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hi ${userName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password for your TaskLynk account. Click the button below to create a new password:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #1D3557 0%, #457B9D 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Reset Password
                      </a>
                    </div>
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #F2A541; padding: 20px; margin: 20px 0;">
                      <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.6;">
                        <strong>⚠️ Important:</strong> This link will expire in 1 hour and can only be used once. If you didn't request this password reset, please ignore this email.
                      </p>
                    </div>
                    
                    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${resetUrl}" style="color: #1D3557; word-break: break-all;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// Email Verification Code
export function getEmailVerificationHTML(userName: string, code: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - TaskLynk</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <div style="display: inline-block; width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; text-align: center; line-height: 80px;">
                        <span style="font-size: 40px;">📧</span>
                      </div>
                    </div>
                    
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">Verify Your Email Address</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello ${userName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Thank you for registering with TaskLynk Academic! Please use the verification code below to verify your email address:
                    </p>
                    
                    <div style="background-color: #f3f4f6; border: 2px dashed #1D3557; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                      <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                      <h1 style="margin: 0; color: #1D3557; font-size: 42px; letter-spacing: 8px; font-weight: bold;">${code}</h1>
                    </div>
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #F2A541; padding: 20px; margin: 20px 0;">
                      <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.6;">
                        <strong>⏰ Important:</strong> This code will expire in 15 minutes. Enter it on the verification page to complete your registration.
                      </p>
                    </div>
                    
                    <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      If you didn't create an account with TaskLynk, please ignore this email.
                    </p>
                    
                    <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Best regards,<br>
                      TaskLynk Academic Team<br>
                      admn@tasklynk.co.ke
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// 5. Order Approved
export function getOrderApprovedEmailHTML(
  freelancerName: string,
  orderId: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order #${orderId} — Approved by Client</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Order #${orderId} — Approved by Client</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello ${freelancerName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Your submission for Order #${orderId} has been approved by the client.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      The order is now marked as Completed, and your payment will be processed shortly.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Thank you for your quality work and dedication!
                    </p>
                    
                    <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Keep it up,<br>
                      TaskLynk Academic Admin
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// 6. Order Cancelled
export function getOrderCancelledEmailHTML(
  freelancerName: string,
  orderId: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order #${orderId} — Order Cancelled</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Order #${orderId} — Order Cancelled</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello ${freelancerName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Unfortunately, Order #${orderId} has been cancelled by the client or admin.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      If you had already started work, please do not proceed further.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      For clarification, contact support through your dashboard or email us directly.
                    </p>
                    
                    <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Best regards,<br>
                      TaskLynk Academic Team<br>
                      admn@tasklynk.co.ke
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// 7. Order Delivered (by Writer)
export function getOrderDeliveredEmailHTML(
  clientName: string,
  orderId: string,
  orderTitle: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order #${orderId} — Work Delivered</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Order #${orderId} — Work Delivered</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello ${clientName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      The writer has submitted the completed work for your order #${orderId}.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You can review the document and:
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6; padding-left: 20px;">
                      • Approve it if you're satisfied, or<br>
                      • Request a revision if changes are needed.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://tasklynk.co.ke/orders/${orderId}" style="display: inline-block; background: linear-gradient(135deg, #1D3557 0%, #457B9D 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Access Your Order
                      </a>
                    </div>
                    
                    <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Thank you for using TaskLynk Academic.
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// 8. Payment Confirmation (for Client)
export function getPaymentConfirmationEmailHTML(
  clientName: string,
  orderId: string,
  amount: number
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Received for Order #${orderId}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Payment Received for Order #${orderId}</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello ${clientName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      We've received your payment of KSh ${amount.toFixed(2)} for Order #${orderId}.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Your order is now being reviewed and will be assigned to a qualified writer shortly.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You can track progress from your dashboard.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Thank you for choosing TaskLynk Academic!
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// 9. Order On Hold
export function getOrderOnHoldEmailHTML(
  freelancerName: string,
  orderId: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order #${orderId} — Currently On Hold</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Order #${orderId} — Currently On Hold</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello ${freelancerName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Order #${orderId} has been placed on hold temporarily by the client or admin.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Please pause all work until further notice.
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You will be notified once the order is resumed or cancelled.
                    </p>
                    
                    <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Thank you for your understanding,<br>
                      TaskLynk Academic Admin
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// 10. New Message Notification
export function getNewMessageNotificationHTML(
  userName: string,
  orderId: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Message on Order #${orderId}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${getEmailHeader()}
                
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">New Message on Order #${orderId}</h2>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hello ${userName},
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You have received a new message regarding Order #${orderId}.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://tasklynk.co.ke/orders/${orderId}" style="display: inline-block; background: linear-gradient(135deg, #1D3557 0%, #457B9D 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Log in to View and Reply
                      </a>
                    </div>
                    
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Please respond promptly to maintain smooth communication.
                    </p>
                  </td>
                </tr>
                
                ${getEmailFooter()}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}