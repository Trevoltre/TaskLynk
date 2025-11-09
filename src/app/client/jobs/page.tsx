"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

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

export default function AllJobsPage() {
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
        setJobs(data);
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
          <h1 className="text-3xl font-bold mb-2">All Jobs</h1>
          <p className="text-muted-foreground">
            View all your posted jobs across all statuses
          </p>
        </div>

        {loadingJobs ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No jobs found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link key={job.id} href={`/client/jobs/${job.id}`}>
                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/40">
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
                        variant={
                          job.status === 'completed' ? 'default' :
                          job.status === 'delivered' ? 'default' :
                          job.status === 'cancelled' ? 'destructive' :
                          'secondary'
                        }
                        className="capitalize"
                      >
                        {job.status.replace('_', ' ')}
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
