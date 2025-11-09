"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { FloatingContact } from '@/components/floating-contact';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, RefreshCw, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// Prevent static generation - this page needs auth context
export const dynamic = 'force-dynamic';

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
};

export default function ClientDeliveredPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async (silent = false) => {
    if (!user) return;
    
    if (!silent) setRefreshing(true);
    
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/jobs?clientId=${user.id}&status=delivered&_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      } else {
        if (!silent) toast.error('Failed to fetch delivered orders');
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      if (!silent) toast.error('Network error');
    } finally {
      setLoadingJobs(false);
      if (!silent) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'client') {
        router.push('/');
      } else if (!user.approved) {
        router.push('/client/dashboard');
      } else {
        fetchJobs();
      }
    }
  }, [user, loading, router]);

  const handleManualRefresh = () => {
    fetchJobs(false);
    toast.success('Refreshing delivered orders...');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <FloatingContact />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-foreground flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                Delivered Orders
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground">
                Review and approve completed work from writers
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleManualRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link href="/client/dashboard">
                <Button variant="secondary" size="lg">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <Card className="mb-6 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Delivery Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Delivered</p>
                <p className="text-3xl font-bold text-foreground">{jobs.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Awaiting Your Review</p>
                <p className="text-3xl font-bold text-green-600">{jobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivered Jobs List */}
        <Card className="shadow-lg border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Delivered Orders</CardTitle>
            <CardDescription className="text-base">
              Review the completed work and approve or request revisions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingJobs ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading delivered orders...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-lg">
                <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-foreground mb-2">No delivered orders</p>
                <p className="text-muted-foreground mb-6">
                  Completed work will appear here for your review
                </p>
                <Link href="/client/dashboard">
                  <Button variant="outline" size="lg">
                    View All Orders
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div 
                    key={job.id}
                    onClick={() => router.push(`/client/jobs/${job.id}`)}
                    className="border-2 rounded-lg p-4 sm:p-5 transition-all cursor-pointer hover:bg-primary/5 border-border hover:border-primary/40 shadow-sm hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-bold text-lg sm:text-xl text-foreground">
                            {job.title}
                          </h3>
                          {job.displayId && (
                            <span className="text-xs font-mono px-2.5 py-1 rounded-md font-semibold text-primary bg-primary/10">
                              {job.displayId}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm whitespace-nowrap">
                        Delivered
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                      <span className="capitalize font-medium">{job.workType}</span>
                      <span>•</span>
                      <span className="font-bold text-foreground">
                        KSh {job.amount.toFixed(2)}
                      </span>
                      <span>•</span>
                      <span className="font-medium">
                        Deadline: {new Date(job.actualDeadline || job.deadline).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>
                        Posted: {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}