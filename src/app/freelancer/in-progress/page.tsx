"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, Search, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { calculateFreelancerAmount } from '@/lib/payment-calculations';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  actualDeadline: string;
  freelancerDeadline: string;
  status: string;
  assignedFreelancerId: number | null;
  adminApproved: boolean;
  createdAt: string;
};

export default function InProgressPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [workTypeFilter, setWorkTypeFilter] = useState<string>('all');
  const [pagesFilter, setPagesFilter] = useState<string>('all');
  const [titleQuery, setTitleQuery] = useState<string>('');
  const [orderIdQuery, setOrderIdQuery] = useState<string>('');

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'freelancer') {
        router.push('/');
      } else if (!user.approved) {
        router.push('/freelancer/dashboard');
      } else {
        fetchJobs();
        
        const interval = setInterval(() => {
          fetchJobs();
        }, 10000);
        
        return () => clearInterval(interval);
      }
    }
  }, [user, loading, router]);

  const fetchJobs = async () => {
    if (!user) return;
    
    setLoadingJobs(true);
    try {
      // CRITICAL: Only fetch jobs assigned to current freelancer
      const response = await fetch(`/api/jobs?assignedFreelancerId=${user.id}`);
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

  // CRITICAL: Only show jobs with status 'in_progress'
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => j.status === 'in_progress');
  }, [jobs]);

  const applyFilters = (list: Job[]) => {
    return list.filter((job) => {
      const wtOk = workTypeFilter === 'all' || job.workType.toLowerCase().includes(workTypeFilter.toLowerCase());
      const threshold = pagesFilter === 'all' ? 0 : parseInt(pagesFilter, 10);
      const pagesOk = (job.pages || 0) >= threshold;
      const titleOk = !titleQuery || job.title.toLowerCase().includes(titleQuery.toLowerCase());
      const idOk = !orderIdQuery || (job.displayId && job.displayId.toLowerCase().includes(orderIdQuery.toLowerCase()));
      return wtOk && pagesOk && titleOk && idOk;
    });
  };

  const displayedJobs = applyFilters(filteredJobs);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">In Progress</h1>
        <p className="text-sm text-muted-foreground">
          Track ongoing projects currently under your work. Update files, request feedback, and ensure timely delivery.
        </p>
      </div>

      {/* Workflow Info Alert */}
      <Alert className="mb-6 bg-green-50 dark:bg-green-950 border-green-200">
        <AlertCircle className="h-4 w-4 text-green-600" />
        <AlertDescription>
          <strong>Active Jobs:</strong> These are jobs assigned to you by admin. Complete and submit them before the deadline. Once submitted, they move to "Delivered" status.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{filteredJobs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active assignments</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3">
              <label className="text-xs text-muted-foreground mb-1 block">Work Type</label>
              <Input placeholder="e.g. Essay, AI Removal" value={workTypeFilter === 'all' ? '' : workTypeFilter} onChange={(e) => setWorkTypeFilter(e.target.value || 'all')} />
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
            <div className="lg:col-span-3">
              <label className="text-xs text-muted-foreground mb-1 block">Topic Title</label>
              <Input placeholder="Search title" value={titleQuery} onChange={(e) => setTitleQuery(e.target.value)} />
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Order ID</label>
              <Input placeholder="e.g. TL-0001" value={orderIdQuery} onChange={(e) => setOrderIdQuery(e.target.value)} />
            </div>
            <div className="lg:col-span-2 flex justify-end">
              <Button variant="default" className="gap-2"><Search className="h-4 w-4" /> Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingJobs ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : displayedJobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No orders in progress</p>
            <p className="text-sm text-muted-foreground mt-2">
              {filteredJobs.length === 0 ? 
                'No active assignments yet. Check "Available Orders" to place bids.' :
                'No orders match your filters'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
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
              {displayedJobs.map((job) => {
                const earnings = calculateFreelancerAmount(job.amount);
                return (
                  <TableRow key={job.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm text-primary font-semibold">{job.displayId || `#${job.id}`}</TableCell>
                    <TableCell className="max-w-[320px] truncate">{job.title}</TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{job.workType}</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-green-600 font-semibold">KSh {earnings.toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell text-center">{job.pages || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell text-center">{job.slides || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{format(new Date(job.freelancerDeadline), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize bg-blue-50 text-blue-700 border-blue-300">
                        In Progress
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/freelancer/jobs/${job.id}`} className="text-primary hover:underline font-medium">Work</Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}