"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, MailCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const VerifyEmailForm = ({ defaultEmail = "" }: { defaultEmail?: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qpEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState<string>(defaultEmail || qpEmail);
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email && (defaultEmail || qpEmail)) {
      setEmail(defaultEmail || qpEmail);
    }
  }, [defaultEmail, qpEmail, email]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    if (!trimmedEmail) {
      toast.error("Email is required");
      return;
    }
    // Remove HTML5 pattern validation - do JavaScript validation instead
    if (!/^\d{6}$/.test(trimmedCode)) {
      toast.error("Please enter the 6-digit code sent to your email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, code: trimmedCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Verification failed");
        return;
      }
      toast.success("Email verified! Your account is ready. You can now sign in with your password.");
      // Redirect to login after 1.5 seconds
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error("Enter your email to resend the code");
      return;
    }

    setResending(true);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to send code");
        return;
      }
      toast.success("A new verification code has been sent to your email");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Gradient Overlay */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

      {/* Back to Home Link */}
      <div className="absolute top-6 left-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <div className="container mx-auto px-4 flex items-center justify-center min-h-screen py-16">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <MailCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Verify your email</h1>
            <p className="text-muted-foreground">
              Enter the 6-digit code we sent to your email to complete your registration
            </p>
          </div>

          {/* Card */}
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl shadow-xl p-8">
            <form onSubmit={handleVerify} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {/* Code - Remove HTML5 pattern attribute */}
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                  disabled={loading}
                  required
                  autoComplete="one-time-code"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                size="lg"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify Email"}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                {resending ? "Sending..." : "Resend code"}
              </button>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Back to Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};