"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { FloatingContact } from '@/components/floating-contact';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Plus, Clock, CheckCircle, AlertTriangle, User, RefreshCw, Phone, XCircle, RotateCcw, Wallet } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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
  isRealOrder?: boolean;
};

type FilterType = 'all' | 'pending' | 'in-progress' | 'delivered' | 'completed';

export default function ClientDashboardPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draftWorkType, setDraftWorkType] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  // Update time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to check if below 6 hours AND NOT delivered/completed
  const isBelowSixHours = (deadline: string, status: string) => {
    // If delivered or completed, never show red
    if (status === 'delivered' || status === 'completed') {
      return false;
    }
    
    const due = new Date(deadline);
    const diffMs = due.getTime() - currentTime.getTime();
    
    if (diffMs <= 0) return true;
    
    const totalHours = diffMs / (1000 * 60 * 60);
    return totalHours < 6;
  };

  // Memoized fetchJobs with aggressive cache busting
  const fetchJobs = useCallback(async (silent = false) => {
    if (!user) return;
    
    if (!silent) setRefreshing(true);
    
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/jobs?clientId=${user.id}&_t=${timestamp}&_r=${Math.random()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
        setLastUpdate(new Date());
      } else {
        if (!silent) {
          toast.error('Failed to fetch jobs');
        }
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      if (!silent) {
        toast.error('Network error. Please check your connection.');
      }
    } finally {
      setLoadingJobs(false);
      if (!silent) setRefreshing(false);
    }
  }, [user]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchJobs(false);
    refreshUser();
    toast.success('Refreshing dashboard...');
  };

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'client') {
        router.push('/');
      } else {
        fetchJobs();
      }
    }
  }, [user, loading, router, fetchJobs]);

  // Real-time listener for work type selection and job updates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let bc: BroadcastChannel | null = null;
    
    try {
      bc = new BroadcastChannel('client_dashboard');
      
      const existing = localStorage.getItem('draftWorkType') || '';
      if (existing) {
        localStorage.removeItem('draftWorkType');
      }

      const onMessage = (ev: MessageEvent) => {
        const msg = ev.data as { type: string; value?: string; jobId?: number };
        if (msg?.type === 'draftWorkType') {
          setDraftWorkType(msg.value || '');
        } else if (msg?.type === 'jobCreated' || msg?.type === 'jobUpdated') {
          fetchJobs(true);
          refreshUser();
        }
      };

      bc.addEventListener('message', onMessage);
      
      return () => {
        if (bc) {
          bc.removeEventListener('message', onMessage);
          bc.close();
        }
      };
    } catch (error) {
      console.error('BroadcastChannel not supported:', error);
    }
  }, [fetchJobs, refreshUser]);

  // One-time approaching deadline toast at 6 hours
  useEffect(() => {
    if (!user?.approved || jobs.length === 0) return;
    try {
      jobs.forEach((job) => {
        const due = new Date(job.actualDeadline || job.deadline);
        const diffMs = due.getTime() - new Date().getTime();
        const hoursLeft = diffMs / (1000 * 60 * 60);
        const isActionable = job.status !== 'delivered' && job.status !== 'completed';
        const storageKey = `client_deadline_warned_${job.id}`;
        if (isActionable && hoursLeft > 0 && hoursLeft < 6) {
          const warned = localStorage.getItem(storageKey);
          if (!warned) {
            toast.warning(`Deadline approaching: ${job.title}${job.displayId ? ` (#${job.displayId})` : ''}`);
            localStorage.setItem(storageKey, '1');
          }
        }
      });
    } catch (e) {
      // noop
    }
  }, [jobs, user?.approved]);

  // Track visibility changes for refresh when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      if (visible) {
        fetchJobs(true);
        refreshUser();
      }
    };

    const handleWindowFocus = () => {
      fetchJobs(true);
      refreshUser();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchJobs, refreshUser]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter jobs based on selected filter
  const filteredJobs = (() => {
    switch (selectedFilter) {
      case 'pending':
        return jobs.filter(j => j.status === 'pending');
      case 'in-progress':
        return jobs.filter(j => ['approved', 'assigned', 'in_progress', 'editing'].includes(j.status));
      case 'delivered':
        return jobs.filter(j => j.status === 'delivered');
      case 'completed':
        return jobs.filter(j => j.status === 'completed');
      case 'all':
      default:
        return jobs;
    }
  })();

  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const activeJobs = jobs.filter(j => ['approved', 'assigned', 'in_progress'].includes(j.status));
  const deliveredJobs = jobs.filter(j => j.status === 'delivered');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <FloatingContact />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
        {!user.approved && (
          <Alert className="mb-6 sm:mb-8 border-amber-400 bg-amber-50 dark:bg-amber-950/20 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-amber-900 dark:text-amber-200 font-medium ml-2">
              <strong className="font-bold">Account Pending Approval:</strong> Your account is awaiting admin approval. 
              Once approved, you'll be able to post jobs and access all features.
            </AlertDescription>
          </Alert>
        )}

        {/* Header Section */}
        <div className="mb-8 sm:mb-10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-foreground">
                Welcome, {user.name}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-4">
                {user.approved ? 'Manage your orders and track progress' : 'Your account is pending approval'}
              </p>
              
              {/* Badges Row */}
              <div className="flex items-center gap-3 flex-wrap">
                {user.approved && user.clientTier && (
                  <Badge 
                    variant="default"
                    className={`capitalize font-semibold text-sm px-3 py-1 ${
                      user.clientTier === 'premium' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md' :
                      user.clientTier === 'gold' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md' :
                      'bg-gray-600 text-white shadow-md'
                    }`}
                  >
                    {user.clientTier} Client
                  </Badge>
                )}
                {user.approved && user.clientPriority && user.clientPriority !== 'regular' && (
                  <Badge variant="destructive" className="font-semibold text-sm px-3 py-1 animate-pulse shadow-md">
                    ⭐ {user.clientPriority.toUpperCase()} PRIORITY
                  </Badge>
                )}
                {user.approved && draftWorkType && (
                  <Badge variant="secondary" className="capitalize text-sm px-3 py-1 shadow-sm">
                    Selected: {draftWorkType}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex items-center gap-3 flex-wrap">
                {user.approved && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className="shadow-sm"
                  >
                    <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
                {user.approved ? (
                  <Link href="/client/new-job">
                    <Button size="lg" className="shadow-md">
                      <Plus className="w-5 h-5 mr-2" />
                      Post New Job
                    </Button>
                  </Link>
                ) : (
                  <Button size="lg" disabled className="opacity-60">
                    <Plus className="w-5 h-5 mr-2" />
                    Post New Job
                  </Button>
                )}
              </div>
              
              {/* Contact Section */}
              <div className="flex items-center gap-2 text-sm bg-primary/5 px-4 py-2.5 rounded-lg border border-primary/15 shadow-sm">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-semibold text-foreground">Call us:</span>
                <a href="tel:0701066845" className="text-primary hover:underline font-bold transition-colors">
                  0701066845
                </a>
                <span className="text-muted-foreground">/</span>
                <a href="tel:0702794172" className="text-primary hover:underline font-bold transition-colors">
                  0702794172
                </a>
              </div>
            </div>
          </div>
        </div>

        {user.approved && (
          <div className="mb-6 flex items-center justify-end gap-3">
            <Badge variant="outline" className="text-xs font-medium shadow-sm">
              Manual refresh mode
            </Badge>
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Profile Card for Unapproved Users */}
        {!user.approved && (
          <Card className="mb-8 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Your Profile</CardTitle>
              <CardDescription className="text-base">
                Review and update your profile information while waiting for approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="font-semibold text-foreground">{user.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="font-semibold text-foreground">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p className="font-semibold text-foreground capitalize">{user.role}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      {user.phone || 'Not provided'}
                      {!user.phone && (
                        <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
                      )}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Link href="/settings">
                    <Button variant="outline" className="shadow-sm">
                      <User className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards - NOW CLICKABLE TO FILTER */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {user.approved ? (
            <div onClick={() => setSelectedFilter('all')} className="cursor-pointer">
              <Card className={`hover:shadow-lg transition-all border-2 ${selectedFilter === 'all' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/30'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">Total Jobs</CardTitle>
                  <FileText className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{jobs.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">All time</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Total Jobs</CardTitle>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-muted-foreground">-</div>
                <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
              </CardContent>
            </Card>
          )}

          {user.approved ? (
            <div onClick={() => setSelectedFilter('pending')} className="cursor-pointer">
              <Card className={`hover:shadow-lg transition-all border-2 ${selectedFilter === 'pending' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'hover:border-amber-400/30'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">Pending</CardTitle>
                  <Clock className="h-5 w-5 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{pendingJobs.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Pending</CardTitle>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-muted-foreground">-</div>
                <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
              </CardContent>
            </Card>
          )}

          {user.approved ? (
            <div onClick={() => setSelectedFilter('in-progress')} className="cursor-pointer">
              <Card className={`hover:shadow-lg transition-all border-2 ${selectedFilter === 'in-progress' ? 'border-blue-400 ring-2 ring-blue-400/20' : 'hover:border-blue-400/30'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">In Progress</CardTitle>
                  <Clock className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{activeJobs.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active orders</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">In Progress</CardTitle>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-muted-foreground">-</div>
                <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
              </CardContent>
            </Card>
          )}

          {user.approved ? (
            <div onClick={() => setSelectedFilter('completed')} className="cursor-pointer">
              <Card className={`hover:shadow-lg transition-all border-2 ${selectedFilter === 'completed' ? 'border-green-400 ring-2 ring-green-400/20' : 'hover:border-green-400/30'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">Completed</CardTitle>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{completedJobs.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Successfully done</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Completed</CardTitle>
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-muted-foreground">-</div>
                <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Access Cards - NEW HORIZONTAL SECTION */}
        {user.approved && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Link href="/client/delivered">
              <Card className="hover:shadow-lg transition-all border-2 hover:border-green-400/50 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-950 p-3 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Delivered Orders</CardTitle>
                      <CardDescription className="text-sm">
                        {deliveredJobs.length} order{deliveredJobs.length !== 1 ? 's' : ''} ready
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Review and approve completed work
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/client/revisions">
              <Card className="hover:shadow-lg transition-all border-2 hover:border-orange-400/50 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 dark:bg-orange-950 p-3 rounded-lg">
                      <RotateCcw className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Revisions</CardTitle>
                      <CardDescription className="text-sm">
                        {jobs.filter(j => j.status === 'revision').length} order{jobs.filter(j => j.status === 'revision').length !== 1 ? 's' : ''} in revision
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track orders being revised
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/client/cancelled">
              <Card className="hover:shadow-lg transition-all border-2 hover:border-red-400/50 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-100 dark:bg-red-950 p-3 rounded-lg">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Cancelled Orders</CardTitle>
                      <CardDescription className="text-sm">
                        {jobs.filter(j => j.status === 'cancelled').length} cancelled order{jobs.filter(j => j.status === 'cancelled').length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View cancelled orders
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Financial Overview */}
            <Link href="/client/financial-overview">
              <Card className="hover:shadow-lg transition-all border-2 hover:border-blue-400/50 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded-lg">
                      <Wallet className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Financial Overview</CardTitle>
                      <CardDescription className="text-sm">
                        Balance, history, add funds
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Manage your payments and wallet
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Jobs List with Filter Indicator */}
        {user.approved && (
          <Card id="my-jobs" className="shadow-lg border-2">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    My Jobs
                    {selectedFilter !== 'all' && (
                      <Badge variant="default" className="capitalize">
                        {selectedFilter === 'in-progress' ? 'In Progress' : selectedFilter}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {selectedFilter === 'all' && 'Track all your posted jobs and their current status'}
                    {selectedFilter === 'pending' && 'Jobs awaiting admin approval'}
                    {selectedFilter === 'in-progress' && 'Active jobs currently being worked on'}
                    {selectedFilter === 'delivered' && 'Jobs delivered and awaiting your approval'}
                    {selectedFilter === 'completed' && 'Successfully completed and approved jobs'}
                  </CardDescription>
                </div>
                {selectedFilter !== 'all' && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedFilter('all')}>
                    Show All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-4">Loading your jobs...</p>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-16 bg-muted/30 rounded-lg">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    {selectedFilter === 'all' ? 'No jobs posted yet' : `No ${selectedFilter === 'in-progress' ? 'in progress' : selectedFilter} jobs`}
                  </p>
                  <p className="text-muted-foreground mb-6">
                    {selectedFilter === 'all' 
                      ? 'Start by posting your first job and we\'ll take care of the rest' 
                      : 'Try selecting a different filter or post a new job'}
                  </p>
                  {selectedFilter === 'all' && (
                    <Link href="/client/new-job">
                      <Button size="lg" className="shadow-md">
                        <Plus className="w-5 h-5 mr-2" />
                        Post Your First Job
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredJobs.map((job) => {
                    const belowSix = isBelowSixHours(job.actualDeadline || job.deadline, job.status);
                    return (
                      <div 
                        key={job.id}
                        onClick={() => router.push(`/client/jobs/${job.id}`)}
                        className={`border-2 rounded-lg p-4 sm:p-5 transition-all cursor-pointer ${
                          belowSix 
                            ? 'hover:bg-red-50 dark:hover:bg-red-950/20 border-red-400 bg-red-50/50 dark:bg-red-950/10 shadow-md hover:shadow-lg' 
                            : 'hover:bg-primary/5 border-border hover:border-primary/40 shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className={`font-bold text-lg sm:text-xl ${
                                belowSix ? 'text-red-700 dark:text-red-400' : 'text-foreground'
                              }`}>
                                {job.title}
                              </h3>
                              {job.displayId && (
                                <span className={`text-xs font-mono px-2.5 py-1 rounded-md font-semibold ${
                                  belowSix 
                                    ? 'text-red-700 dark:text-red-400 bg-red-200 dark:bg-red-950' 
                                    : 'text-primary bg-primary/10'
                                }`}>
                                  {job.displayId}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={
                              job.status === 'completed' ? 'default' :
                              job.status === 'delivered' ? 'default' :
                              job.status === 'cancelled' ? 'destructive' :
                              'secondary'
                            }
                            className={`capitalize font-semibold text-sm whitespace-nowrap ${
                              belowSix ? 'bg-red-600 hover:bg-red-700 text-white' : ''
                            }`}
                          >
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className={`flex items-center gap-3 text-sm flex-wrap ${
                          belowSix ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'
                        }`}>
                          <span className="capitalize font-medium">{job.workType}</span>
                          <span>•</span>
                          <span className={`font-bold ${
                            belowSix ? 'text-red-700 dark:text-red-400' : 'text-foreground'
                          }`}>
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}