export default function AccountOwnerSetupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-card border border-border rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Welcome, Account Owner!</h1>
          <p className="text-muted-foreground mb-6">
            Your account has been successfully created. Please wait for admin approval to access all features.
          </p>
        </div>

        <div className="space-y-6 bg-muted/50 rounded-lg p-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">What happens next?</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">Admin Review</p>
                  <p className="text-sm text-muted-foreground">
                    Our admin team will review your registration within 24-48 hours.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Email Notification</p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll receive an email once your account is approved.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">Access Dashboard</p>
                  <p className="text-sm text-muted-foreground">
                    Log in and start posting jobs, managing orders, and accessing all account owner features.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-2">As an Account Owner, you can:</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <li>✓ Post and manage writing jobs</li>
              <li>✓ Add team members to your account</li>
              <li>✓ Track all orders and progress</li>
              <li>✓ Manage payments and billing</li>
              <li>✓ Communicate with writers</li>
              <li>✓ Download completed work</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 text-center space-y-4">
          <a
            href="/login"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Go to Login
          </a>
          <p className="text-sm text-muted-foreground">
            Need help? Contact us at{' '}
            <a href="mailto:support@tasklynk.com" className="text-primary hover:underline">
              support@tasklynk.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
