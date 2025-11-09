import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailForm } from "./verify-email-form";

export const metadata: Metadata = {
  title: "Verify Email | TaskLynk",
  description: "Enter the 6-digit code sent to your email to verify your TaskLynk account.",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading verification form...</p>
        </div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}