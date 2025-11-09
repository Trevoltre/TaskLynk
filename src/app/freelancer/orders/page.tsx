"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Eye, Clock, TrendingDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateFreelancerAmount } from '@/lib/payment-calculations';

type Job = {
  id: number;
  clientId: number;
  displayId: string;
  title: string;
  instructions: string;
  workType: string;
  pages: number | null;
  slides: number | null;
  amount: number;
  deadline: string;
  freelancerDeadline: string;
  status: string;
  assignedFreelancerId: number | null;
  adminApproved: boolean;
  createdAt: string;
  isRealOrder?: boolean;
};

type Bid = {
  id: number;
  jobId: number;
  freelancerId: number;
  bidAmount: number;
  message: string;
  status: string;
  createdAt: string;
};

// Calculate freelancer earnings based on job type (SAME AS DETAIL PAGE)
const calculateFreelancerEarnings = (workType: string, pages: number | null, slides: number | null): number => {
  const normalizedType = workType.toLowerCase().trim();
  
  // AI Removal - 60 per page, 30 per slide
  if (normalizedType.includes('ai removal') || normalizedType.includes('ai-removal') || normalizedType.includes('ai content')) {
    const pageEarnings = (pages || 0) * 60;
    const slideEarnings = (slides || 0) * 30;
    const total = pageEarnings + slideEarnings;
    return total > 0 ? total : 60;
  }
  
  // Plag AI Report - 30 per report (flat rate)
  if (normalizedType.includes('plag') || normalizedType.includes('plagiarism')) {
    return 30;
  }
  
  // Grammarly and Proofreading - 30 per page
  if (normalizedType.includes('grammarly') || normalizedType.includes('proofread')) {
    const total = (pages || 0) * 30;
    return total > 0 ? total : 30;
  }
  
  // Default: Writing jobs - 150 per page, 90 per slide
  const pageEarnings = (pages || 0) * 150;
  const slideEarnings = (slides || 0) * 90;
  const total = pageEarnings + slideEarnings;
  return total > 0 ? total : 150;
};

export default function FreelancerOrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [academicLevel, setAcademicLevel] = useState('All Available');
  const [discipline, setDiscipline] = useState('');
  const [deadline, setDeadline] = useState('All available');
  const [pages, setPages] = useState('All available');
  const [cost, setCost] = useState('All available');
  const [topicTitle, setTopicTitle] = useState('');
  const [orderId, setOrderId] = useState('');
  const [trackId, setTrackId] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tab, setTab] = useState<'available' | 'my-bids'>('available');
  const [completedBalance, setCompletedBalance] = useState<{ balance: number; count: number; avg: number } | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'freelancer') {
        router.push('/');
      } else if (!user.approved) {
        router.push('/freelancer/dashboard');
      } else {
        fetchJobs();
        fetchMyBids();
        fetchCompletedBalance();
        // Refresh every 10 seconds
        const interval = setInterval(() => {
          fetchJobs();
          fetchMyBids();
          fetchCompletedBalance();
        }, 10000);
        return () => clearInterval(interval);
      }
    }
  }, [user, loading, router]);

  // Update time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      // CRITICAL: Only show approved jobs that are NOT assigned yet
      const response = await fetch(`/api/jobs?status=approved&excludeFreelancerBids=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        // Filter to only show jobs that are approved and not assigned
        setJobs(data.filter((j: Job) => j.adminApproved && !j.assignedFreelancerId));
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchMyBids = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/bids?freelancerId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setMyBids(data);
      }
    } catch (error) {
      console.error('Failed to fetch bids:', error);
    }
  };

  const fetchCompletedBalance = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/freelancer/completed-orders-balance?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setCompletedBalance({
          balance: Number(data.completedOrdersBalance || 0),
          count: Number(data.completedOrdersCount || 0),
          avg: Number(data.averageOrderValue || 0),
        });
      }
    } catch (e) {
      console.error('Failed to fetch completed balance', e);
    }
  };

  const handleSearch = () => {
    fetchJobs();
  };

  // Available jobs are only those without bids from current user AND not assigned
  const availableJobs = jobs;

  const filteredJobs = availableJobs.filter(job => {
    if (discipline && job.workType.toLowerCase() !== discipline.toLowerCase()) return false;
    if (topicTitle && !job.title.toLowerCase().includes(topicTitle.toLowerCase())) return false;
    if (orderId && job.id.toString() !== orderId) return false;
    return true;
  });

  // Calculate remaining time from freelancer deadline (60% of actual time)
  const getCountdownTime = (freelancerDeadline: string) => {
    const due = new Date(freelancerDeadline);
    const diffMs = due.getTime() - currentTime.getTime();
    
    if (diffMs <= 0) {
      return { text: 'Expired', expired: true, urgent: true };
    }

    const twelveHoursMs = 12 * 60 * 60 * 1000;
    const isUrgent = diffMs <= twelveHoursMs;
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (diffDays > 0) {
      return { text: `${diffDays}d ${diffHours}h ${diffMins}m`, expired: false, urgent: isUrgent };
    }
    if (diffHours > 0) {
      return { text: `${diffHours}h ${diffMins}m ${diffSecs}s`, expired: false, urgent: isUrgent };
    }
    return { text: `${diffMins}m ${diffSecs}s`, expired: false, urgent: isUrgent };
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">Available Orders</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Browse all available jobs approved by admin. View details, download instructions, and place your bids.
        </p>
        <Alert className="mt-3 sm:mt-4 bg-blue-50 dark:bg-blue-950 border-blue-200">
          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
          <AlertDescription className="text-xs sm:text-sm">
            <strong>Competitive Bidding:</strong> Most competitive bids win! Orders disappear once assigned to another writer.
          </AlertDescription>
        </Alert>
      </div>

      {/* Completed balance summary */}
      {completedBalance && (
        <Card className="mb-4 sm:mb-6">
          <CardContent className="py-3 sm:py-4 flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">Completed Orders Balance (70%)</div>
              <div className="text-xl sm:text-2xl font-semibold text-green-600">KES {completedBalance.balance.toFixed(0)}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="secondary" className="text-xs">Completed: {completedBalance.count}</Badge>
              <Badge variant="outline" className="text-xs">Avg per order: KES {completedBalance.avg.toFixed(0)}</Badge>
              <Link href="/freelancer/financial-overview">
                <Button variant="default" size="sm">View Financials</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Card */}
      <Card className="mb-4 sm:mb-6 md:mb-8 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 border-cyan-500/20">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-sm sm:text-base md:text-lg">Orders Available - {filteredJobs.length}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {/* Academic Level */}
            <div>
              <Label htmlFor="academicLevel" className="text-xs sm:text-sm">Academic Level:</Label>
              <Select value={academicLevel} onValueChange={setAcademicLevel}>
                <SelectTrigger id="academicLevel" className="text-xs sm:text-sm h-8 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Available">All Available</SelectItem>
                  <SelectItem value="High School">High School</SelectItem>
                  <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                  <SelectItem value="Graduate">Graduate</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discipline */}
            <div>
              <Label htmlFor="discipline" className="text-xs sm:text-sm">Discipline:</Label>
              <Input
                id="discipline"
                placeholder="Art (Fine arts, Performing arts)"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>

            {/* Deadline */}
            <div>
              <Label htmlFor="deadline" className="text-xs sm:text-sm">Deadline:</Label>
              <Select value={deadline} onValueChange={setDeadline}>
                <SelectTrigger id="deadline" className="text-xs sm:text-sm h-8 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All available">All available</SelectItem>
                  <SelectItem value="Within 24h">Within 24h</SelectItem>
                  <SelectItem value="Within 3 days">Within 3 days</SelectItem>
                  <SelectItem value="Within 7 days">Within 7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Track ID */}
            <div>
              <Label htmlFor="trackId" className="text-xs sm:text-sm">Track ID</Label>
              <Input
                id="trackId"
                placeholder="Track ID"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>

            {/* Pages */}
            <div>
              <Label htmlFor="pages" className="text-xs sm:text-sm">Pages:</Label>
              <Select value={pages} onValueChange={setPages}>
                <SelectTrigger id="pages" className="text-xs sm:text-sm h-8 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All available">All available</SelectItem>
                  <SelectItem value="1-5">1-5 pages</SelectItem>
                  <SelectItem value="6-10">6-10 pages</SelectItem>
                  <SelectItem value="11+">11+ pages</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cost */}
            <div>
              <Label htmlFor="cost" className="text-xs sm:text-sm">Your Earnings:</Label>
              <Select value={cost} onValueChange={setCost}>
                <SelectTrigger id="cost" className="text-xs sm:text-sm h-8 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All available">All available</SelectItem>
                  <SelectItem value="0-600">KES 0-600</SelectItem>
                  <SelectItem value="600-3000">KES 600-3000</SelectItem>
                  <SelectItem value="3000+">KES 3000+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Topic Title */}
            <div>
              <Label htmlFor="topicTitle" className="text-xs sm:text-sm">Topic Title</Label>
              <Input
                id="topicTitle"
                placeholder="Topic Title"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                className="text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>

            {/* Order ID */}
            <div>
              <Label htmlFor="orderId" className="text-xs sm:text-sm">Order ID</Label>
              <div className="flex gap-1 sm:gap-2">
                <Input
                  id="orderId"
                  placeholder="Order ID"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-10"
                />
                <Button onClick={handleSearch} size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                  <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 flex justify-end">
            <Button onClick={handleSearch} size="sm">Search</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'available' | 'my-bids')}>
        <TabsList className="grid w-full grid-cols-2 mb-3 sm:mb-4">
          <TabsTrigger value="available" className="text-xs sm:text-sm">Available ({filteredJobs.length})</TabsTrigger>
          <TabsTrigger value="my-bids" className="text-xs sm:text-sm">My Bids ({myBids.length})</TabsTrigger>
        </TabsList>

        {/* Available Orders - table layout like reference */}
        <TabsContent value="available" className="mt-3 sm:mt-4">
          {loadingJobs ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground text-sm">
                  {availableJobs.length === 0 ? 
                    'No available orders at the moment' : 
                    'No orders match your filters'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 sm:w-20 md:w-24 text-xs sm:text-sm">id</TableHead>
                    <TableHead className="text-xs sm:text-sm">Topic</TableHead>
                    <TableHead className="w-20 sm:w-24 md:w-28 text-xs sm:text-sm">Price</TableHead>
                    <TableHead className="w-12 sm:w-16 md:w-20 text-xs sm:text-sm">Pg</TableHead>
                    <TableHead className="w-12 sm:w-16 md:w-20 text-xs sm:text-sm">Sl</TableHead>
                    <TableHead className="w-24 sm:w-28 md:w-36 text-xs sm:text-sm">Subject</TableHead>
                    <TableHead className="w-28 sm:w-32 md:w-40 text-xs sm:text-sm">Deadline</TableHead>
                    <TableHead className="w-16 sm:w-20 md:w-24 text-xs sm:text-sm">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => {
                    const countdown = getCountdownTime(job.freelancerDeadline);
                    const freelancerAmount = calculateFreelancerAmount(job.amount);
                    
                    return (
                      <TableRow 
                        key={job.id} 
                        className={`${countdown.expired ? 'opacity-60' : ''} cursor-pointer hover:bg-muted/50 transition-colors`}
                        onClick={() => router.push(`/freelancer/orders/${job.id}`)}
                      >
                        <TableCell className="font-mono text-primary text-xs sm:text-sm">
                          <div className="flex flex-col gap-1">
                            <span>{job.displayId || job.id}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] sm:max-w-[300px] md:max-w-[360px]">
                          <div className="flex flex-col gap-1">
                            <div className="truncate font-medium text-xs sm:text-sm">{job.title}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600 text-xs sm:text-sm">KES {freelancerAmount.toFixed(0)}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{job.pages ?? '-'}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{job.slides ?? '-'}</TableCell>
                        <TableCell className="capitalize text-xs sm:text-sm">{job.workType}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${countdown.expired || countdown.urgent ? 'text-red-600' : 'text-green-600'}`}> 
                            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span className="text-[10px] sm:text-xs">{countdown.text}</span>
                            {countdown.urgent && !countdown.expired && (
                              <Badge variant="destructive" className="ml-1 text-[8px] sm:text-xs px-1 py-0">&lt;12h</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/freelancer/orders/${job.id}`}>
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" /> 
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* My Bids - enhanced with status indicators */}
        <TabsContent value="my-bids" className="mt-3 sm:mt-4">
          {myBids.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground text-sm">You have not placed any bids yet.</p>
                <div className="mt-4">
                  <Button onClick={() => setTab('available')} size="sm">
                    Browse Orders <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  Pending: {myBids.filter(b => b.status === 'pending').length}
                </Badge>
                <Badge variant="default" className="gap-1 bg-green-600 text-xs">
                  Accepted: {myBids.filter(b => b.status === 'accepted').length}
                </Badge>
                <Badge variant="destructive" className="gap-1 text-xs">
                  Rejected: {myBids.filter(b => b.status === 'rejected').length}
                </Badge>
              </div>
              
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 sm:w-20 md:w-24 text-xs sm:text-sm">Order id</TableHead>
                      <TableHead className="text-xs sm:text-sm">Message</TableHead>
                      <TableHead className="w-20 sm:w-24 md:w-28 text-xs sm:text-sm">Your Bid</TableHead>
                      <TableHead className="w-20 sm:w-24 md:w-28 text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="w-28 sm:w-32 md:w-40 text-xs sm:text-sm">Placed</TableHead>
                      <TableHead className="w-16 sm:w-20 md:w-24 text-xs sm:text-sm">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myBids.map((bid) => (
                      <TableRow 
                        key={bid.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          // Navigate to appropriate page based on bid status
                          if (bid.status === 'accepted') {
                            router.push(`/freelancer/jobs/${bid.jobId}`);
                          } else {
                            router.push(`/freelancer/orders/${bid.jobId}`);
                          }
                        }}
                      >
                        <TableCell className="font-mono text-primary text-xs sm:text-sm">{bid.jobId}</TableCell>
                        <TableCell className="max-w-[200px] sm:max-w-[300px] md:max-w-[420px] truncate text-xs sm:text-sm">{bid.message || '-'}</TableCell>
                        <TableCell className="font-semibold text-xs sm:text-sm">KES {Number(bid.bidAmount || 0).toFixed(0)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              bid.status === 'accepted' ? 'default' : 
                              bid.status === 'rejected' ? 'destructive' : 
                              'secondary'
                            } 
                            className="capitalize text-xs"
                          >
                            {bid.status === 'accepted' && '✓ '}
                            {bid.status === 'rejected' && '✗ '}
                            {bid.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">{new Date(bid.createdAt).toLocaleString()}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Link href={bid.status === 'accepted' ? `/freelancer/jobs/${bid.jobId}` : `/freelancer/orders/${bid.jobId}`}>
                            <Button size="sm" variant={bid.status === 'accepted' ? 'default' : 'outline'} className="h-7 sm:h-8 text-xs px-2 sm:px-3">
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" /> 
                              <span className="hidden sm:inline">{bid.status === 'accepted' ? 'Work' : 'View'}</span>
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}