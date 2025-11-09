"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { Shield, Eye, EyeOff, ArrowLeft } from 'lucide-react';

// Authorized admin emails
const ADMIN_EMAILS = [
  'topwriteessays@gmail.com',
  'm.d.techpoint25@gmail.com',
  'maguna956@gmail.com',
  'tasklynk01@gmail.com',
  'maxwellotieno11@gmail.com',
  'ashleydothy3162@gmail.com'
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Check if admin is already registered
  const checkAdminRegistered = async (email: string) => {
    try {
      const response = await fetch(`/api/users?email=${encodeURIComponent(email)}&role=admin`);
      if (response.ok) {
        const users = await response.json();
        return users.length > 0;
      }
      return false;
    } catch (error) {
      console.error('Error checking admin:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate email is in authorized list
      if (!ADMIN_EMAILS.includes(formData.email.toLowerCase())) {
        toast.error('Unauthorized email. Only authorized admins can register.');
        setIsLoading(false);
        return;
      }

      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        setIsLoading(false);
        return;
      }

      // Validate password length
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }

      // Check if admin already registered
      const alreadyRegistered = await checkAdminRegistered(formData.email);
      if (alreadyRegistered) {
        toast.info('Admin account already exists. Redirecting to regular login...');
        setTimeout(() => {
          router.push(`/login?email=${encodeURIComponent(formData.email)}`);
        }, 2000);
        setIsLoading(false);
        return;
      }

      // Register admin account
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
          role: 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Registration failed');
        setIsLoading(false);
        return;
      }

      toast.success('Admin account created! Redirecting to dashboard...');
      
      // Auto-login and redirect to admin dashboard
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        localStorage.setItem('user', JSON.stringify(loginData.user));
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error('Admin registration error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg mb-4">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Admin Registration</h1>
            <p className="text-muted-foreground">
              Authorized administrators only
            </p>
          </div>

          {/* Admin Registration Form */}
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter authorized admin email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Only authorized admin emails are permitted
                </p>
              </div>

              {/* Phone Number Field */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="e.g., +254701066845"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={isLoading}
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
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
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

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Registering...' : 'Register Admin Account'}
              </Button>
            </form>

            {/* Already Registered */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already registered?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>This page is restricted to authorized TaskLynk administrators.</p>
            <p>Unauthorized access attempts are logged and monitored.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
