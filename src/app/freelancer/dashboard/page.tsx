"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { FloatingContact } from '@/components/floating-contact';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, FileText, Clock, AlertTriangle, Briefcase, Receipt, User, Eye } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { calculateFreelancerAmount } from '@/lib/payment-calculations';

type Job = {
  id: number;
  clientId: number;
  title: string;
  instructions: string;
  workType: string;
  pages: number | null;
  slides: number | null;
  amount: number;
  deadline: string;
  status: string;
  assignedFreelancerId: number | null;
  adminApproved: boolean;
  createdAt: string;
};

// NEW: Bid type
type Bid = {
  id: number;
  jobId: number;
  freelancerId: number;
  bidAmount: number;
  message: string;
  status: string;
  createdAt: string;
};

// Loading skeleton component
const JobCardSkeleton = () => (
  <div className="border rounded-lg p-4 space-y-3">
    <Skeleton className="h-6 w-3/4" />
    <div className="flex gap-4">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-28" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-9 w-28" />
  </div>
);

function FreelancerDashboardContent() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [availableJobsCount, setAvailableJobsCount] = useState(0);
  const [loadingJobs, setLoadingJobs] = useState(true);
  // NEW: bids state
  const [myBids, setMyBids] = useState<Bid[]>([]);
  // FIXED: Initialize with true to avoid hydration mismatch, update after mount
  const [isOnline, setIsOnline] = useState<boolean>(true);
  // NEW: completed earnings summary
  const [completedEarnings, setCompletedEarnings] = useState<{ balance: number; count: number }>({ balance: 0, count: 0 });

  useEffect(() => {
    // Update online status after mount to avoid hydration mismatch
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'freelancer') {
        router.push('/');
      } else {
        fetchData();
      }
    }
  }, [user, loading, router]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoadingJobs(true);
    try {
      const timestamp = Date.now();
      if (user.approved) {
        // Fetch assigned jobs
        const assignedResponse = await fetch(`/api/jobs?assignedFreelancerId=${user.id}&_=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (assignedResponse.ok) {
          const data = await assignedResponse.json();
          setMyJobs(data);
        }

        // Fetch available jobs count
        const availableResponse = await fetch(`/api/jobs?status=approved&adminApproved=true&_=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (availableResponse.ok) {
          const availableData = await availableResponse.json();
          setAvailableJobsCount(availableData.length);
        }

        // NEW: Fetch my bids
        const bidsRes = await fetch(`/api/bids?freelancerId=${user.id}&_=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (bidsRes.ok) {
          const bids = await bidsRes.json();
          setMyBids(bids);
        }

        // NEW: Fetch completed earnings summary (70%)
        const earningsRes = await fetch(`/api/freelancer/completed-orders-balance?userId=${user.id}&_=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (earningsRes.ok) {
          const summary = await earningsRes.json();
          setCompletedEarnings({ balance: Number(summary.completedOrdersBalance || 0), count: Number(summary.completedOrdersCount || 0) });
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Memoized computed values
  const { inProgressJobs, deliveredJobs, completedJobs } = useMemo(() => ({
    inProgressJobs: myJobs.filter(j => j.status === 'in_progress' || j.status === 'assigned'),
    deliveredJobs: myJobs.filter(j => j.status === 'delivered'),
    completedJobs: myJobs.filter(j => j.status === 'completed'),
  }), [myJobs]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingContact />
      <div className="px-4 md:px-6 lg:px-8 py-6">
        {/* Approval Status Alert - Only shown for unapproved users */}
        {!user.approved && (
          <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Account Pending Approval:</strong> Your account is awaiting admin approval. 
              Once approved, you'll be able to view available jobs and place bids.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">{user.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-muted-foreground">
                {user.approved 
                  ? 'Browse available jobs, place bids, and manage your orders' 
                  : 'Your account is pending approval'}
              </p>
              {/* Freelancer Badge */}
              {user.approved && user.freelancerBadge && (
                <Badge 
                  variant="default"
                  className={`capitalize font-semibold ${
                    user.freelancerBadge === 'platinum' ? 'bg-gradient-to-r from-slate-400 to-gray-500 text-white' :
                    user.freelancerBadge === 'gold' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                    user.freelancerBadge === 'silver' ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' :
                    'bg-gradient-to-r from-orange-600 to-red-500 text-white'
                  }`}
                >
                  {user.freelancerBadge} Writer
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-3.5 w-3.5 rounded-full ring-2 ring-background ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        {/* Profile Section for Unapproved Users */}
        {!user.approved && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Profile</CardTitle>
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-xs text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              <CardDescription>
                Review and update your profile information while waiting for approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium capitalize">{user.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{user.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="font-medium">KSh {user.balance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="font-medium">{user.rating ? `${user.rating.toFixed(1)} ⭐` : 'Not rated yet'}</p>
                  </div>
                </div>
                <div className="pt-4">
                  <Link href="/freelancer/settings">
                    <Button variant="outline">
                      <User className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats - Clickable cards that filter jobs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link href="/freelancer/financial-overview">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KSh {user.balance.toFixed(2)}</div>
                {/* NEW: completed earnings */}
                <p className="text-xs text-muted-foreground mt-1">
                  Completed earnings (70%): KSh {completedEarnings.balance.toFixed(2)} • {completedEarnings.count} orders
                </p>
              </CardContent>
            </Card>
          </Link>

          {user.approved ? (
            <Link href="/freelancer/orders">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Jobs</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{availableJobsCount}</div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Jobs</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
              </CardContent>
            </Card>
          )}

          {user.approved ? (
            <Link href="#active-jobs" scroll={false}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inProgressJobs.length}</div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
              </CardContent>
            </Card>
          )}

          {user.approved ? (
            <Link href="#completed-jobs" scroll={false}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedJobs.length}</div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* NEW: My Bids summary card */}
        {user.approved && (
          <div className="mb-8">
            <Link href="/freelancer/orders">
              <Card className="hover:shadow-lg transition-all cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>My Bids</CardTitle>
                    <CardDescription>Recent bids you have placed</CardDescription>
                  </div>
                  <div className="text-2xl font-bold">{myBids.length}</div>
                </CardHeader>
                <CardContent>
                  {myBids.length === 0 ? (
                    <p className="text-muted-foreground">No bids yet. Browse orders to place your first bid.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-28">Order</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead className="w-28">Your Bid</TableHead>
                            <TableHead className="w-28">Status</TableHead>
                            <TableHead className="w-40">Placed</TableHead>
                            <TableHead className="w-24">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myBids.slice(0, 5).map(bid => (
                            <TableRow key={bid.id}>
                              <TableCell className="font-mono text-primary">{bid.jobId}</TableCell>
                              <TableCell className="max-w-[400px] truncate">{bid.message || '-'}</TableCell>
                              <TableCell className="font-semibold">KES {Number(bid.bidAmount || 0).toFixed(0)}</TableCell>
                              <TableCell>
                                <Badge variant={bid.status === 'accepted' ? 'default' : bid.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
                                  {bid.status || 'pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(bid.createdAt).toLocaleString()}</TableCell>
                              <TableCell>
                                <Link href={`/freelancer/orders/${bid.jobId}`}>
                                  <Button size="sm" variant="outline"><Eye className="w-4 h-4 mr-1" /> View</Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Recent Jobs - Only for approved users */}
        {user.approved && (
          <Card id="active-jobs">
            <CardHeader>
              <CardTitle>Recent Assigned Jobs</CardTitle>
              <CardDescription>
                Your most recent job assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <JobCardSkeleton key={i} />)}
                </div>
              ) : myJobs.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No jobs assigned yet
                  </p>
                  <Link href="/freelancer/orders">
                    <Button>
                      <Briefcase className="w-4 h-4 mr-2" />
                      Browse Available Jobs
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {myJobs.slice(0, 5).map((job) => (
                    <Link key={job.id} href={`/freelancer/jobs/${job.id}`}>
                      <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{job.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                              <Badge variant="outline" className="capitalize">{job.workType}</Badge>
                              {/* UPDATED: 70% earnings */}
                              <span className="font-semibold text-green-600">
                                KSh {calculateFreelancerAmount(job.amount).toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">(70% of order value)</span>
                              <span>Due: {format(new Date(job.deadline), 'MMM dd, yyyy')}</span>
                            </div>
                          </div>
                          <Badge
                            variant={
                              job.status === 'completed' ? 'default' :
                              job.status === 'delivered' ? 'default' :
                              'secondary'
                            }
                            className="capitalize"
                          >
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function FreelancerDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <FreelancerDashboardContent />
    </Suspense>
  );
}