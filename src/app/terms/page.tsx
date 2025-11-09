export default function TermsPage() {
  return (
    <section className="min-h-screen py-16">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms and Conditions</h1>
            <p className="text-xl text-muted-foreground">TaskLynk Net - "Connecting Talent with Tasks."</p>
          </div>

          {/* Company Overview */}
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Company Overview</h2>
            <div className="space-y-3 text-foreground/90">
              <p><strong>Company Name:</strong> TaskLynk Net</p>
              <p><strong>Slogan:</strong> "Connecting Talent with Tasks."</p>
              <p><strong>Core Focus:</strong> TaskLynk is an academic and professional writing platform that connects clients seeking high-quality written projects with verified freelancers (writers, editors, designers, and proofreaders).</p>
              <p>TaskLynk ensures transparent, secure, and timely delivery of academic papers, slides, reports, designs, and document services. Through automation and smart task management, the platform provides seamless collaboration — from job posting to order completion and payment processing.</p>
            </div>
          </div>

          {/* Core Values */}
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Core Values</h2>
            <ul className="space-y-2 text-foreground/90">
              <li><strong>Integrity:</strong> We uphold honesty and accountability in every transaction.</li>
              <li><strong>Excellence:</strong> Every submission reflects professionalism and quality.</li>
              <li><strong>Security:</strong> We safeguard user data and payments with strict privacy standards.</li>
              <li><strong>Transparency:</strong> Open communication between clients, freelancers, and admins.</li>
              <li><strong>Innovation:</strong> We leverage AI responsibly to enhance — not replace — human skill.</li>
            </ul>
          </div>

          {/* Company Policy */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-6">📜 Company Policy (All Users)</h2>

            {/* 1. General Terms */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-3">1️⃣ General Terms</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li>By creating an account, users agree to TaskLynk's Terms of Service, Privacy Policy, and Payment Policy.</li>
                <li>All users must provide accurate personal and contact information.</li>
                <li>Accounts may be suspended or terminated for violation of these terms.</li>
              </ul>
            </div>

            {/* 2. Account Roles */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-3">2️⃣ Account Roles and Responsibilities</h3>
              
              <h4 className="font-bold text-lg mt-4 mb-2">👩‍💼 Client Policy</h4>
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li>Clients must provide clear order instructions, deadlines, and materials.</li>
                <li>Minimum payment rates are set at <strong>KSh 250 per page</strong> and <strong>KSh 150 per slide</strong>.</li>
                <li>Clients can request revisions once per order; excessive revisions may incur additional fees.</li>
                <li>Clients are prohibited from uploading offensive, illegal, or unethical assignments (e.g., hate speech, criminal intent).</li>
                <li>Payment is made through the designated M-Pesa Paybill/Bank and verified by the admin before files are downloadable.</li>
                <li>Refunds are issued only for unfulfilled or cancelled orders as per platform discretion.</li>
              </ul>

              <h4 className="font-bold text-lg mt-4 mb-2">✍️ Freelancer Policy</h4>
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li>Freelancers earn <strong>70%</strong> of the total client payment.</li>
                <li>Writers must ensure originality — no plagiarism, AI-generated, or reused content.</li>
                <li>Every uploaded paper must pass a plagiarism and AI detection check.</li>
                <li>Using tools such as ChatGPT, Gemini, or Jasper to generate entire work is strictly prohibited; however, limited AI assistance (grammar, phrasing) may be allowed.</li>
                <li>Freelancers must meet deadlines and follow all client instructions precisely.</li>
                <li>Missed deadlines, copied content, or refusal to revise can lead to penalties or permanent account termination.</li>
                <li>Freelancers may not engage in direct deals outside the platform (bypassing TaskLynk's payment system).</li>
              </ul>

              <h4 className="font-bold text-lg mt-4 mb-2">👨‍💻 Admin Policy</h4>
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li>Admins have full control over order management, user approval, and dispute resolution.</li>
                <li>Admins may reassign, cancel, or approve jobs at any time if necessary.</li>
                <li>Admins review all uploads for compliance with plagiarism and originality standards before delivery.</li>
                <li>Admins manage financial settlements and ensure freelancers' balances reflect approved, completed work.</li>
              </ul>
            </div>

            {/* 3. Academic Integrity */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-3">3️⃣ Academic Integrity & AI Policy</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li>All content must be <strong>100% original and manually written</strong>.</li>
                <li>TaskLynk reserves the right to use AI detection tools (GPTZero, Turnitin, Copyleaks, etc.) to verify authenticity.</li>
                <li>Detected AI-generated or plagiarized content will result in:
                  <ul className="list-disc pl-6 mt-2">
                    <li>Immediate order cancellation.</li>
                    <li>Non-payment to freelancer.</li>
                    <li>Account suspension or permanent ban.</li>
                  </ul>
                </li>
              </ul>
            </div>

            {/* 4. Anti-Fraud */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-3">4️⃣ Anti-Fraud & Security Policy</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li>Fraudulent behavior such as fake payments, impersonation, or document tampering is strictly prohibited.</li>
                <li>All payments are processed through verified M-Pesa or bank channels only.</li>
                <li>Attempting to deceive clients, freelancers, or admin results in immediate account closure and possible legal action.</li>
              </ul>
            </div>

            {/* 5. Communication */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-3">5️⃣ Communication Policy</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li>All communication must happen within the platform's chat system.</li>
                <li>Messages are monitored and approved before delivery to prevent spam or unethical content.</li>
                <li>Sharing personal contacts, social media, or off-platform payment details is forbidden.</li>
              </ul>
            </div>

            {/* 6. Payments */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-3">6️⃣ Payments & Withdrawals</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li>Clients pay before accessing completed work.</li>
                <li>Freelancers receive 70% of the approved payment once the order is marked "Completed."</li>
                <li>Withdrawals are processed weekly or as per admin approval.</li>
                <li>The company retains 30% commission for service fees, infrastructure, and transaction support.</li>
              </ul>
            </div>

            {/* 7. Suspension */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-3">7️⃣ Suspension and Account Termination</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li>Violation of these policies results in temporary suspension or permanent deactivation.</li>
                <li>Repeated offenders are blacklisted permanently and forfeit pending balances.</li>
              </ul>
            </div>

            {/* 8. Privacy */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-3">8️⃣ Privacy and Data Protection</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li>TaskLynk complies with international data protection laws (GDPR principles).</li>
                <li>Personal and financial information is stored securely in encrypted Supabase storage.</li>
              </ul>
            </div>

            {/* 9. Dispute Resolution */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-3">9️⃣ Dispute Resolution</h3>
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li>In case of disputes, the admin panel acts as the final arbiter after reviewing evidence from both parties.</li>
                <li>Admin decisions are final to maintain fairness and platform integrity.</li>
              </ul>
            </div>
          </div>

          {/* Acceptance Notice */}
          <div className="mt-8 bg-primary/10 border border-primary/20 rounded-lg p-6">
            <p className="text-sm text-foreground/80">
              <strong>By registering on TaskLynk, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions and Company Policy.</strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}