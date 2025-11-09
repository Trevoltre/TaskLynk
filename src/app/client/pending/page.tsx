"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Job = {
  id: number;
  displayId: string;
  title: string;
  workType: string;
  amount: number;
  status: string;
  deadline: string;
  actualDeadline: string;
  createdAt: string;
  assignedFreelancerId: number | null;
  adminApproved: boolean;
};

export default function PendingJobsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'client') {
        router.push('/');
      } else if (!user.approved) {
        router.push('/client/dashboard');
      } else {
        fetchJobs();
        // Refresh every 10 seconds
        const interval = setInterval(fetchJobs, 10000);
        return () => clearInterval(interval);
      }
    }
  }, [user, loading, router]);

  const fetchJobs = async () => {
    if (!user) return;
    
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/jobs?clientId=${user.id}&_t=${timestamp}`, {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const data = await response.json();
        // CRITICAL: Only show jobs that are pending (not approved by admin yet) OR approved but not assigned
        const pending = data.filter((j: Job) => 
          (j.status === 'pending' && !j.adminApproved) || 
          (j.status === 'approved' && j.adminApproved && !j.assignedFreelancerId)
        );
        setJobs(pending);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pending Orders</h1>
          <p className="text-muted-foreground">
            Jobs awaiting admin approval and writer assignment
          </p>
        </div>

        {/* Order Status Info Alert */}
        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <strong>Order Flow:</strong> Your orders will remain here until admin approves them and assigns a writer. Once assigned, they move to "In Progress".
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{jobs.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting admin review</p>
            </CardContent>
          </Card>
        </div>

        {loadingJobs ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending jobs</p>
              <p className="text-sm text-muted-foreground mt-2">All your orders have been approved and assigned to writers</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link key={job.id} href={`/client/jobs/${job.id}`}>
                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-amber-400/40 bg-amber-50/30 dark:bg-amber-950/10">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{job.title}</CardTitle>
                          {job.displayId && (
                            <Badge variant="outline" className="font-mono">
                              {job.displayId}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          <span className="capitalize">{job.workType}</span>
                          <span>•</span>
                          <span className="font-bold text-green-600">KSh {job.amount.toFixed(2)}</span>
                          <span>•</span>
                          <span>Deadline: {format(new Date(job.actualDeadline || job.deadline), 'MMM dd, yyyy')}</span>
                          <span>•</span>
                          <span>Posted: {format(new Date(job.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className="capitalize bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {job.adminApproved ? 'Awaiting Assignment' : 'Pending Approval'}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}