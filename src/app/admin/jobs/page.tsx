"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { LeftNav } from '@/components/left-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, UserPlus, Ban, FileText, Download, Eye, Clock } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';

type Job = {
  id: number;
  clientId: number;
  clientName?: string | null;
  displayId: string;
  title: string;
  instructions: string;
  workType: string;
  pages: number | null;
  slides: number | null;
  amount: number;
  deadline: string;
  freelancerDeadline?: string;
  status: string;
  assignedFreelancerId: number | null;
  adminApproved: boolean;
  createdAt: string;
};

type Freelancer = {
  id: number;
  name: string;
  email: string;
  rating: number | null;
  balance: number;
};

type Bid = {
  id: number;
  jobId: number;
  freelancerId: number;
  message: string;
  bidAmount: number;
  status: string;
  createdAt: string;
  freelancerName?: string;
  freelancerEmail?: string;
  freelancerRating?: number | null;
};

export default function AdminJobsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [bids, setBids] = useState<{[key: number]: Bid[]}>({});
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedFreelancer, setSelectedFreelancer] = useState<string>('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [bidsDialogOpen, setBidsDialogOpen] = useState(false);
  const [selectedJobForBids, setSelectedJobForBids] = useState<Job | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Countdown helper (urgent when < 12h)
  const getCountdown = (deadlineStr: string) => {
    const due = new Date(deadlineStr);
    const diffMs = due.getTime() - currentTime.getTime();
    if (isNaN(due.getTime())) return { text: '-', expired: false, urgent: false };
    if (diffMs <= 0) return { text: 'Expired', expired: true, urgent: true };
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    const urgent = diffMs <= twelveHoursMs;
    const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const h = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diffMs % (1000 * 60)) / 1000);
    if (d > 0) return { text: `${d}d ${h}h ${m}m`, expired: false, urgent };
    if (h > 0) return { text: `${h}h ${m}m ${s}s`, expired: false, urgent };
    return { text: `${m}m ${s}s`, expired: false, urgent };
  };

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        fetchJobs();
        fetchFreelancers();
      }
    }
  }, [user, loading, router]);

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      const response = await fetch('/api/jobs');
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
        
        // Fetch bids for each job with freelancer details
        data.forEach(async (job: Job) => {
          const bidsResponse = await fetch(`/api/bids?jobId=${job.id}`);
          if (bidsResponse.ok) {
            const bidsData = await bidsResponse.json();
            
            // Enrich bids with freelancer information
            const enrichedBids = await Promise.all(
              bidsData.map(async (bid: Bid) => {
                const freelancerResponse = await fetch(`/api/users/${bid.freelancerId}`);
                if (freelancerResponse.ok) {
                  const freelancerData = await freelancerResponse.json();
                  return {
                    ...bid,
                    freelancerName: freelancerData.name,
                    freelancerEmail: freelancerData.email,
                    freelancerRating: freelancerData.rating
                  };
                }
                return bid;
              })
            );
            
            // Sort bids by amount (lowest first) and then by creation date
            enrichedBids.sort((a, b) => {
              if (a.bidAmount !== b.bidAmount) {
                return a.bidAmount - b.bidAmount;
              }
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });
            
            setBids(prev => ({ ...prev, [job.id]: enrichedBids }));
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchFreelancers = async () => {
    try {
      const response = await fetch('/api/users?role=freelancer&approved=true');
      if (response.ok) {
        const data = await response.json();
        setFreelancers(data);
      }
    } catch (error) {
      console.error('Failed to fetch freelancers:', error);
    }
  };

  const handleApprove = async (jobId: number) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });

      if (response.ok) {
        toast.success('Job approved successfully');
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to approve job:', error);
    }
  };

  const handleReject = async (jobId: number) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false }),
      });

      if (response.ok) {
        toast.success('Job rejected');
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to reject job:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedJob || !selectedFreelancer) return;

    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freelancerId: parseInt(selectedFreelancer) }),
      });

      if (response.ok) {
        toast.success('Job assigned successfully');
        fetchJobs();
        setAssignDialogOpen(false);
        setBidsDialogOpen(false);
        setSelectedJob(null);
        setSelectedJobForBids(null);
        setSelectedFreelancer('');
      }
    } catch (error) {
      console.error('Failed to assign job:', error);
    }
  };

  const handleCancel = async (jobId: number) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        toast.success('Job cancelled');
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const handleConfirmPayment = async (jobId: number) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (response.ok) {
        toast.success('Payment confirmed, job completed');
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to confirm payment:', error);
    }
  };

  const openBidsDialog = (job: Job, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedJobForBids(job);
    setBidsDialogOpen(true);
  };

  const assignFromBids = (freelancerId: number) => {
    setSelectedFreelancer(freelancerId.toString());
    setSelectedJob(selectedJobForBids);
    setBidsDialogOpen(false);
    setAssignDialogOpen(true);
  };

  const filteredJobs = jobs.filter((j) => {
    if (filter === 'all') return true;
    return j.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const variants: {[key: string]: any} = {
      pending: 'secondary',
      approved: 'default',
      assigned: 'default',
      in_progress: 'default',
      editing: 'default',
      delivered: 'default',
      completed: 'default',
      cancelled: 'destructive',
      revision: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'} className="capitalize">{status.replace('_', ' ')}</Badge>;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <DashboardNav />
      <LeftNav 
        role="admin" 
        userName={user.name} 
        userRole={user.role}
      />
      <div className="min-h-screen bg-background ml-64 transition-all duration-300">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Job Management</h1>
            <p className="text-muted-foreground">
              Approve, assign, and manage all jobs on the platform
            </p>
          </div>

          <Tabs value={filter} onValueChange={setFilter} className="space-y-4">
            <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
              <TabsTrigger value="pending">
                Pending
                <Badge variant="secondary" className="ml-2">
                  {jobs.filter(j => j.status === 'pending').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="assigned">Assigned</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="editing">
                Editing
                <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100">
                  {jobs.filter(j => j.status === 'editing').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={filter}>
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize">{filter.replace('_', ' ')} Jobs</CardTitle>
                  <CardDescription>
                    {filter === 'pending' && 'Jobs waiting for admin approval'}
                    {filter === 'approved' && 'Approved jobs ready for assignment'}
                    {filter === 'assigned' && 'Jobs assigned to freelancers'}
                    {filter === 'in_progress' && 'Jobs currently being worked on'}
                    {filter === 'editing' && 'Jobs submitted by freelancers awaiting admin review'}
                    {filter === 'delivered' && 'Jobs delivered and awaiting client approval'}
                    {filter === 'completed' && 'Successfully completed jobs'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingJobs ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No jobs found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Bids</TableHead>
                            <TableHead>Deadline</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredJobs.map((job) => {
                            const jobBids = bids[job.id] || [];
                            const lowestBid = jobBids.length > 0 ? Math.min(...jobBids.map(b => b.bidAmount)) : null;
                            const deadlineToUse = (job as any).freelancerDeadline || job.deadline;
                            const cd = getCountdown(deadlineToUse);
                            
                            return (
                              <TableRow 
                                key={job.id} 
                                className="cursor-pointer transition-colors hover:bg-muted/50"
                                onClick={() => router.push(`/admin/jobs/${job.id}`)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Link 
                                    href={`/admin/jobs/${job.id}`}
                                    className="font-mono text-xs text-primary hover:underline font-semibold"
                                  >
                                    {job.displayId}
                                  </Link>
                                  {job.clientName && (
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                      {job.clientName}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium max-w-xs truncate">
                                  <div className="flex items-center gap-2 hover:text-primary">
                                    <FileText className="w-4 h-4 flex-shrink-0" />
                                    <span>{job.title}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">
                                    {job.workType}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-semibold">
                                  <div>KSh {job.amount.toFixed(2)}</div>
                                  {lowestBid && lowestBid < job.amount && (
                                    <div className="text-xs text-green-600 dark:text-green-400 font-normal">
                                      Lowest: KSh {lowestBid.toFixed(2)}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {jobBids.length > 0 ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => openBidsDialog(job, e)}
                                      className="relative"
                                    >
                                      <UserPlus className="w-4 h-4 mr-1" />
                                      {jobBids.length} {jobBids.length === 1 ? 'Bid' : 'Bids'}
                                      <Badge 
                                        variant="secondary" 
                                        className="ml-2 bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100"
                                      >
                                        {jobBids.length}
                                      </Badge>
                                    </Button>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">No bids</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span>{format(new Date(job.deadline), 'MMM dd, yyyy')}</span>
                                    <span className={`text-xs flex items-center gap-1 ${cd.expired || cd.urgent ? 'text-red-600' : 'text-green-600'}`}>
                                      <Clock className="w-3 h-3" />
                                      {cd.text}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {job.status === 'editing' ? (
                                    <Badge className="capitalize bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100 border border-purple-300 dark:border-purple-700">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Under Review
                                    </Badge>
                                  ) : (
                                    getStatusBadge(job.status)
                                  )}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Link href={`/admin/jobs/${job.id}`}>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                      >
                                        <Eye className="w-4 h-4 mr-1" />
                                        View
                                      </Button>
                                    </Link>
                                    {job.status === 'delivered' && (
                                      <Button
                                        size="sm"
                                        className="bg-green-600 text-white hover:bg-green-700"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleConfirmPayment(job.id);
                                        }}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Confirm Payment
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Bids Management Dialog */}
        <Dialog open={bidsDialogOpen} onOpenChange={setBidsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bid Management</DialogTitle>
              <DialogDescription>
                View all bids for this job and assign to a freelancer
              </DialogDescription>
            </DialogHeader>
            {selectedJobForBids && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{selectedJobForBids.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Order ID: <span className="font-mono">{selectedJobForBids.displayId}</span>
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {selectedJobForBids.workType}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Job Amount</p>
                      <p className="font-semibold text-lg">KSh {selectedJobForBids.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Bids</p>
                      <p className="font-semibold text-lg">{bids[selectedJobForBids.id]?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Deadline</p>
                      <p className="font-semibold text-sm">{format(new Date(selectedJobForBids.deadline), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                </div>

                {bids[selectedJobForBids.id] && bids[selectedJobForBids.id].length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Bids (Sorted by Amount)</Label>
                      <Badge variant="secondary">
                        {bids[selectedJobForBids.id].length} {bids[selectedJobForBids.id].length === 1 ? 'Bid' : 'Bids'}
                      </Badge>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {bids[selectedJobForBids.id].map((bid, index) => {
                        const savingsPercent = ((selectedJobForBids.amount - bid.bidAmount) / selectedJobForBids.amount * 100);
                        const isBestBid = index === 0;
                        
                        return (
                          <div 
                            key={bid.id} 
                            className={`border rounded-lg p-4 transition-all ${
                              isBestBid 
                                ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                                : 'border-border bg-card hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-base">
                                    {bid.freelancerName || `Freelancer #${bid.freelancerId}`}
                                  </p>
                                  {isBestBid && (
                                    <Badge className="bg-green-600 text-white">
                                      Lowest Bid
                                    </Badge>
                                  )}
                                  {bid.freelancerRating && (
                                    <Badge variant="outline" className="ml-1">
                                      ★ {bid.freelancerRating.toFixed(1)}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {bid.freelancerEmail}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Bid placed: {format(new Date(bid.createdAt), 'MMM dd, yyyy HH:mm')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-primary">
                                  KSh {bid.bidAmount.toFixed(2)}
                                </p>
                                {savingsPercent > 0 && (
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    {savingsPercent.toFixed(0)}% below job amount
                                  </p>
                                )}
                                {savingsPercent < 0 && (
                                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    {Math.abs(savingsPercent).toFixed(0)}% above job amount
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {bid.message && (
                              <div className="mb-3 p-3 bg-background rounded border">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Message:</p>
                                <p className="text-sm">{bid.message}</p>
                              </div>
                            )}
                            
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => assignFromBids(bid.freelancerId)}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Assign to {bid.freelancerName?.split(' ')[0] || 'This Freelancer'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No bids received yet for this job</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setBidsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Freelancer Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Assignment</DialogTitle>
              <DialogDescription>
                Assign this job to the selected freelancer
              </DialogDescription>
            </DialogHeader>
            {selectedJob && selectedFreelancer && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-medium">{selectedJob.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Amount: KSh {selectedJob.amount.toFixed(2)}
                  </p>
                </div>
                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-1">Assigning to:</p>
                  <p className="font-semibold">
                    {freelancers.find(f => f.id.toString() === selectedFreelancer)?.name}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssign}>
                Confirm Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}