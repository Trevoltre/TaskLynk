"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<string>('');
  const [isAccountOwner, setIsAccountOwner] = useState<string>('');
  const [accountOwnerId, setAccountOwnerId] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast.error('You must agree to the Terms and Conditions to continue');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!role) {
      toast.error('Please select a role');
      return;
    }

    // Validate client-specific fields
    if (role === 'client') {
      if (!isAccountOwner) {
        toast.error('Please specify if you are an account owner');
        return;
      }
      
      if (isAccountOwner === 'no' && !accountOwnerId.trim()) {
        toast.error('Please specify which account you belong to');
        return;
      }
    }

    if (!phone || phone.trim() === '') {
      toast.error('Phone number is required');
      return;
    }

    // Kenyan phone validation
    const rawPhone = phone.trim().replace(/[\s-]/g, '');
    const kePhoneRegex = /^(?:\+254[17]\d{8}|0[17]\d{8})$/;
    if (!kePhoneRegex.test(rawPhone)) {
      toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Call the new registration API
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          name,
          role,
          phone: rawPhone
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || 'Registration failed');
        return;
      }

      toast.success('Registration successful! Check your email for the verification code.');
      router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
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
            <Link href="/" className="inline-block mb-4">
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/ChatGPT-Image-Oct-30-2025-04_43_49-AM-1761788698512.png?width=800&height=800&resize=contain"
                alt="TaskLynk Logo"
                width={160}
                height={45}
                className="h-12 w-auto object-contain mx-auto"
              />
            </Link>
            <h1 className="text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-muted-foreground">
              Sign up to get started with TaskLynk
            </p>
          </div>

          {/* Registration Form */}
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Phone Number Field */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., 0712345678 or +254712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Required for M-Pesa payments</p>
              </div>

              {/* Role Field */}
              <div className="space-y-2">
                <Label htmlFor="role">I am a</Label>
                <Select 
                  value={role} 
                  onValueChange={(value) => {
                    setRole(value);
                    // Reset client-specific fields when role changes
                    if (value !== 'client') {
                      setIsAccountOwner('');
                      setAccountOwnerId('');
                    }
                  }} 
                  disabled={loading} 
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client (I need writing services)</SelectItem>
                    <SelectItem value="freelancer">Freelancer (I provide writing services)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Account Owner Selection - Only for Clients */}
              {role === 'client' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="isAccountOwner">Are you an account owner?</Label>
                    <Select 
                      value={isAccountOwner} 
                      onValueChange={(value) => {
                        setIsAccountOwner(value);
                        // Reset account owner ID when selection changes
                        if (value === 'yes') {
                          setAccountOwnerId('');
                        }
                      }} 
                      disabled={loading} 
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes, I am an account owner</SelectItem>
                        <SelectItem value="no">No, I belong to an existing account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Account Selection - Only if not an account owner */}
                  {isAccountOwner === 'no' && (
                    <div className="space-y-2">
                      <Label htmlFor="accountOwnerId">Which account do you belong to?</Label>
                      <Input
                        id="accountOwnerId"
                        type="text"
                        placeholder="Enter account owner's email or account ID"
                        value={accountOwnerId}
                        onChange={(e) => setAccountOwnerId(e.target.value)}
                        required
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Contact your account owner for this information
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Terms and Conditions Checkbox */}
              <div className="flex items-start space-x-3 py-3">
                <Checkbox 
                  id="terms" 
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  disabled={loading}
                  className="mt-1"
                />
                <label 
                  htmlFor="terms" 
                  className="text-sm leading-relaxed text-foreground/90 cursor-pointer"
                >
                  I agree to TaskLynk's{' '}
                  <Link href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                    Company Policy
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                size="lg"
                disabled={loading || !agreedToTerms}
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              New accounts require admin approval before access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}