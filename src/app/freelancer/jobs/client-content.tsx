"use client";

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, FileText, CheckCircle, AlertCircle, Search, Filter } from 'lucide-react';
import { format, differenceInHours, differenceInDays } from 'date-fns';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { calculateFreelancerAmount } from '@/lib/payment-calculations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CountdownTimer } from '@/components/countdown-timer';
import { Skeleton } from '@/components/ui/skeleton';

export type Job = {
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
  actualDeadline: string;
  freelancerDeadline: string;
  status: string;
  assignedFreelancerId: number | null;
  adminApproved: boolean;
  createdAt: string;
};

const STATUS_MAP: Record<string, string[]> = {
  'on-hold': ['on_hold', 'on-hold', 'assigned', 'pending_assignment'],
  'in-progress': ['in_progress', 'assigned'],
  'editing': ['editing'],
  'done': ['delivered'],
  'delivered': ['delivered'],
  'revision': ['revision'],
  'approved': ['approved'],
  'completed': ['completed'],
  'cancelled': ['cancelled', 'canceled'],
};

// Page titles and captions based on status
const PAGE_CONTENT: Record<string, { title: string; caption: string }> = {
  'on-hold': {
    title: 'On Hold',
    caption: 'View orders temporarily paused or awaiting clarification from admin or client before proceeding.'
  },
  'in-progress': {
    title: 'In Progress',
    caption: 'Track ongoing projects currently under your work. Update files, request feedback, and ensure timely delivery.'
  },
  'editing': {
    title: 'Editing',
    caption: 'Access tasks returned for editing or improvement. Make necessary corrections before resubmitting to admin.'
  },
  'done': {
    title: 'Done',
    caption: 'Review orders you\'ve completed and submitted for review. Await admin or client confirmation.'
  },
  'delivered': {
    title: 'Delivered',
    caption: 'Orders successfully delivered to the client. Monitor for client approval or revision requests.'
  },
  'revision': {
    title: 'Revision',
    caption: 'View orders that have been sent back for revision. Address client feedback and re-upload updated work.'
  },
  'approved': {
    title: 'Approved',
    caption: 'View tasks officially approved by clients and confirmed by admin. Payment pending or being processed.'
  },
  'completed': {
    title: 'Completed',
    caption: 'Explore fully completed and paid orders. Review earnings and client ratings for your portfolio.'
  },
  'cancelled': {
    title: 'Cancelled',
    caption: 'View orders that have been cancelled by admin or client. Access status notes or reasons for cancellation.'
  },
};

// Debounce hook for search inputs
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Memoized Stats Card Component
const StatsCard = memo(({ title, value, icon: Icon }: { title: string; value: number; icon: any }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
));
StatsCard.displayName = 'StatsCard';

// Skeleton loading for stats
const StatsCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16" />
    </CardContent>
  </Card>
);

// Skeleton loading for table
const TableSkeleton = () => (
  <div className="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[110px]">Order</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="hidden md:table-cell">Type</TableHead>
          <TableHead className="hidden md:table-cell text-right">Earnings</TableHead>
          <TableHead className="hidden md:table-cell text-center">Pg</TableHead>
          <TableHead className="hidden md:table-cell text-center">Sl</TableHead>
          <TableHead className="hidden lg:table-cell">Deadline</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
            <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export function FreelancerJobsContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = (searchParams.get('status') || '').toLowerCase();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [workTypeFilter, setWorkTypeFilter] = useState<string>('all');
  const [pagesFilter, setPagesFilter] = useState<string>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('all');
  const [titleQuery, setTitleQuery] = useState<string>('');
  const [orderIdQuery, setOrderIdQuery] = useState<string>('');

  // Debounced search values
  const debouncedTitleQuery = useDebounce(titleQuery, 300);
  const debouncedOrderIdQuery = useDebounce(orderIdQuery, 300);

  const pageContent = statusParam && PAGE_CONTENT[statusParam] 
    ? PAGE_CONTENT[statusParam]
    : { title: 'Assigned Orders', caption: 'Manage your assigned orders and track progress. Upload drafts, communicate with the client, and stay on schedule.' };

  // Memoized fetch function
  const fetchJobs = useCallback(async (isBackground = false) => {
    if (!user) return;
    
    if (!isBackground) setLoadingJobs(true);
    else setIsRefreshing(true);
    
    try {
      const response = await fetch(`/api/jobs?assignedFreelancerId=${user.id}`, {
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
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'freelancer') {
        router.push('/');
      } else if (!user.approved) {
        router.push('/freelancer/dashboard');
      } else {
        fetchJobs(false);
        
        // Optimized polling - only when tab is visible
        let interval: NodeJS.Timeout;
        
        const handleVisibilityChange = () => {
          if (document.hidden) {
            clearInterval(interval);
          } else {
            fetchJobs(true);
            interval = setInterval(() => {
              fetchJobs(true);
            }, 15000); // Reduced to 15s for better performance
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Initial interval
        interval = setInterval(() => {
          if (!document.hidden) {
            fetchJobs(true);
          }
        }, 15000);
        
        return () => {
          clearInterval(interval);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }
    }
  }, [user, loading, router, fetchJobs]);

  // Memoized base jobs list
  const baseJobs = useMemo(() => {
    if (!statusParam || !STATUS_MAP[statusParam]) return jobs;
    const allowed = STATUS_MAP[statusParam];
    return jobs.filter((j) => allowed.includes(j.status));
  }, [jobs, statusParam]);

  // Memoized categorized jobs
  const activeJobs = useMemo(() => baseJobs.filter(j => j.status === 'in_progress' || j.status === 'assigned' || j.status === 'revision'), [baseJobs]);
  const deliveredJobs = useMemo(() => baseJobs.filter(j => j.status === 'delivered' || j.status === 'editing'), [baseJobs]);
  const completedJobs = useMemo(() => baseJobs.filter(j => j.status === 'completed'), [baseJobs]);
  const allJobs = baseJobs;

  // Memoized filter function
  const applyFilters = useCallback((list: Job[]) => {
    return list.filter((job) => {
      const wtOk = workTypeFilter === 'all' || job.workType.toLowerCase().includes(workTypeFilter.toLowerCase());
      const threshold = pagesFilter === 'all' ? 0 : parseInt(pagesFilter, 10);
      const pagesOk = (job.pages || 0) >= threshold;
      
      let deadlineOk = true;
      if (deadlineFilter !== 'all') {
        const now = new Date();
        const due = new Date((job as any).freelancerDeadline || (job as any).deadline);
        if (deadlineFilter === 'today') {
          deadlineOk = differenceInDays(due, now) === 0;
        } else if (deadlineFilter === '24h') {
          deadlineOk = differenceInHours(due, now) <= 24;
        } else if (deadlineFilter === '3d') {
          deadlineOk = differenceInDays(due, now) <= 3;
        } else if (deadlineFilter === '7d') {
          deadlineOk = differenceInDays(due, now) <= 7;
        }
      }
      
      const titleOk = !debouncedTitleQuery || job.title.toLowerCase().includes(debouncedTitleQuery.toLowerCase());
      const idOk = !debouncedOrderIdQuery || (job.displayId && job.displayId.toLowerCase().includes(debouncedOrderIdQuery.toLowerCase()));
      return wtOk && pagesOk && deadlineOk && titleOk && idOk;
    });
  }, [workTypeFilter, pagesFilter, deadlineFilter, debouncedTitleQuery, debouncedOrderIdQuery]);

  // Top filter bar component
  const FilterBar = memo(() => (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {statusParam && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filtered by status:</span>
            <Badge variant="secondary" className="capitalize">{statusParam.replace('-', ' ')}</Badge>
            <Link href="/freelancer/jobs" className="ml-2 text-primary hover:underline">Clear</Link>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-3">
            <label className="text-xs text-muted-foreground mb-1 block">Work Type</label>
            <Input 
              placeholder="e.g. Essay, AI Removal" 
              value={workTypeFilter === 'all' ? '' : workTypeFilter} 
              onChange={(e) => setWorkTypeFilter(e.target.value || 'all')} 
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Pages</label>
            <Select value={pagesFilter} onValueChange={setPagesFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
                <SelectItem value="10">10+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Deadline</label>
            <Select value={deadlineFilter} onValueChange={setDeadlineFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All available" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All available</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="24h">Within 24h</SelectItem>
                <SelectItem value="3d">Within 3 days</SelectItem>
                <SelectItem value="7d">Within 7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-3">
            <label className="text-xs text-muted-foreground mb-1 block">Topic Title</label>
            <Input 
              placeholder="Search title" 
              value={titleQuery} 
              onChange={(e) => setTitleQuery(e.target.value)} 
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Order ID</label>
            <Input 
              placeholder="e.g. TL-0001" 
              value={orderIdQuery} 
              onChange={(e) => setOrderIdQuery(e.target.value)} 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  ));
  FilterBar.displayName = 'FilterBar';

  const renderTable = useCallback((list: Job[]) => {
    const filtered = applyFilters(list);

    if (loadingJobs) {
      return <TableSkeleton />;
    }

    if (filtered.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No orders to show</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Order</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell text-right">Earnings</TableHead>
              <TableHead className="hidden md:table-cell text-center">Pg</TableHead>
              <TableHead className="hidden md:table-cell text-center">Sl</TableHead>
              <TableHead className="hidden lg:table-cell">Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((job) => {
              const earnings = calculateFreelancerAmount(job.amount);
              const statusBadgeVariant =
                job.status === 'completed' ? 'default' :
                job.status === 'delivered' || job.status === 'editing' ? 'secondary' :
                job.status === 'revision' ? 'destructive' : 'outline';
              return (
                <TableRow key={job.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm text-primary font-semibold">
                    {job.displayId || `#${job.id}`}
                    {job.clientName && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-normal">
                        {job.clientName}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate">{job.title}</TableCell>
                  <TableCell className="hidden md:table-cell capitalize">{job.workType}</TableCell>
                  <TableCell className="hidden md:table-cell text-right text-green-600">KSh {earnings.toFixed(2)}</TableCell>
                  <TableCell className="hidden md:table-cell text-center">{job.pages || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell text-center">{job.slides || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <CountdownTimer 
                      deadline={(job as any).freelancerDeadline || (job as any).deadline}
                      status={job.status}
                      showIcon={false}
                      className="text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant as any} className="capitalize">
                      {job.status === 'editing' ? 'Under Admin Review' : job.status === 'in_progress' ? 'In Progress' : job.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/freelancer/jobs/${job.id}`} className="text-primary hover:underline">View</Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }, [applyFilters, loadingJobs]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">{pageContent.title}</h1>
          <p className="text-sm text-muted-foreground">
            {pageContent.caption}
          </p>
        </div>
        {isRefreshing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Refreshing...</span>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {loadingJobs ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard title="Active Orders" value={activeJobs.length} icon={Clock} />
            <StatsCard title="Delivered" value={deliveredJobs.length} icon={FileText} />
            <StatsCard title="Completed" value={completedJobs.length} icon={CheckCircle} />
            <StatsCard title="Total Orders" value={allJobs.length} icon={AlertCircle} />
          </>
        )}
      </div>

      {/* Filter bar */}
      <FilterBar />

      {/* Jobs Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">
            Active ({activeJobs.length})
          </TabsTrigger>
          <TabsTrigger value="delivered">
            Delivered ({deliveredJobs.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedJobs.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({allJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {renderTable(activeJobs)}
        </TabsContent>

        <TabsContent value="delivered" className="mt-6">
          {renderTable(deliveredJobs)}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {renderTable(completedJobs)}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          {renderTable(allJobs)}
        </TabsContent>
      </Tabs>
    </div>
  );
}