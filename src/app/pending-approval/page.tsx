"use client";

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function PendingApprovalPage() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Real-time polling for approval status
  useEffect(() => {
    if (!user?.id) return;

    // Check approval status every 3 seconds
    const checkApprovalStatus = async () => {
      try {
        setChecking(true);
        const response = await fetch(`/api/users/${user.id}`);
        
        if (response.ok) {
          const userData = await response.json();
          
          // If approved, show success message and redirect to dashboard
          if (userData.approved) {
            toast.success('🎉 Your account has been approved!', {
              description: 'Redirecting to your dashboard...',
            });
            
            // Refresh user data in auth context
            await refreshUser();
            
            // Redirect based on role after a short delay
            setTimeout(() => {
              if (userData.role === 'admin') {
                router.push('/admin/dashboard');
              } else if (userData.role === 'client') {
                router.push('/client/dashboard');
              } else if (userData.role === 'freelancer') {
                router.push('/freelancer/dashboard');
              }
            }, 1500);
          }
          
          // If rejected, show error and logout
          if (userData.rejectedAt) {
            toast.error('Account Rejected', {
              description: userData.rejectionReason || 'Your account application was not approved.',
            });
            
            setTimeout(() => {
              logout();
              router.push('/');
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Failed to check approval status:', error);
      } finally {
        setChecking(false);
      }
    };

    // Initial check
    checkApprovalStatus();

    // Set up polling interval
    const interval = setInterval(checkApprovalStatus, 3000);

    return () => clearInterval(interval);
  }, [user?.id, router, logout, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4 relative">
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            {checking && (
              <div className="absolute inset-0 rounded-full border-2 border-yellow-600 border-t-transparent animate-spin" />
            )}
          </div>
          <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
          <CardDescription>
            Your account is currently under review by our admin team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm mb-2">
              <strong>Name:</strong> {user?.name}
            </p>
            <p className="text-sm mb-2">
              <strong>Email:</strong> {user?.email}
            </p>
            <p className="text-sm">
              <strong>Role:</strong> {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Real-time Updates Active
              </p>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              This page will automatically update when your account is approved. You'll receive a notification and be redirected to your dashboard.
            </p>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Thank you for registering with TaskLynk. Our admin team will review your application shortly.
            </p>
            <p>
              You will receive access to the platform once your account has been approved.
            </p>
            <p className="font-medium text-foreground">
              Please keep this page open or check back later. You'll also receive an email notification.
            </p>
          </div>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}