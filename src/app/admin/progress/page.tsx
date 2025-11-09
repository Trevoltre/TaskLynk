"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  FileText, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  ArrowLeft,
  Calendar,
  User,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { LeftNav } from '@/components/left-nav';

type Writer = {
  id: number;
  name: string;
  email: string;
  rating: number | null;
  balance: number;
  activeJobs: number;
  completedJobs: number;
  totalEarnings: number;
};

type Job = {
  id: number;
  displayId: string;
  title: string;
  workType: string;
  pages: number | null;
  slides: number | null;
  amount: number;
  deadline: string;
  actualDeadline: string;
  status: string;
  clientId: number;
  clientName?: string;
  createdAt: string;
  revisionRequested: boolean;
  paymentConfirmed: boolean;
};

type ProgressSummary = {
  totalWriters: number;
  totalActiveJobs: number;
  totalCompletedToday: number;
  totalRevisions: number;
  avgJobsPerWriter: number;
};

// Helper function to safely format dates
const formatSafeDate = (dateString: string | null | undefined, formatStr: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, formatStr);
  } catch (error) {
    return 'Invalid Date';
  }
};

export default function AdminProgressPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [writers, setWriters] = useState<Writer[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [selectedWriter, setSelectedWriter] = useState<Writer | null>(null);
  const [writerJobs, setWriterJobs] = useState<Job[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        fetchProgressData();
      }
    }
  }, [user, loading, router]);

  const fetchProgressData = async () => {
    try {
      setLoadingData(true);
      
      // PERFORMANCE FIX: Parallel API calls instead of sequential
      const [freelancersResponse, jobsResponse] = await Promise.all([
        fetch('/api/users?role=freelancer&approved=true', {
          next: { revalidate: 30 } // Cache for 30 seconds
        }),
        fetch('/api/jobs', {
          next: { revalidate: 30 } // Cache for 30 seconds
        })
      ]);
      
      if (!freelancersResponse.ok || !jobsResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const [freelancersData, jobsData] = await Promise.all([
        freelancersResponse.json(),
        jobsResponse.json()
      ]);
      
      // Calculate writer statistics
      const writerStats: Writer[] = freelancersData.map((freelancer: any) => {
        const assignedJobs = jobsData.filter((job: Job) => 
          job.assignedFreelancerId === freelancer.id
        );
        
        const activeJobs = assignedJobs.filter((job: Job) => 
          ['assigned', 'editing', 'revision'].includes(job.status)
        );
        
        const completedJobs = assignedJobs.filter((job: Job) => 
          job.status === 'completed'
        );
        
        const totalEarnings = completedJobs.reduce((sum: number, job: Job) => 
          sum + (job.amount * 0.7), 0
        );
        
        return {
          id: freelancer.id,
          name: freelancer.name,
          email: freelancer.email,
          rating: freelancer.rating,
          balance: freelancer.balance || 0,
          activeJobs: activeJobs.length,
          completedJobs: completedJobs.length,
          totalEarnings
        };
      });
      
      writerStats.sort((a, b) => b.activeJobs - a.activeJobs);
      setWriters(writerStats);
      
      // Calculate summary
      const totalActiveJobs = writerStats.reduce((sum, w) => sum + w.activeJobs, 0);
      const totalRevisions = jobsData.filter((job: Job) => 
        job.status === 'revision' || job.revisionRequested
      ).length;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedToday = jobsData.filter((job: Job) => {
        const completedDate = new Date(job.createdAt);
        return job.status === 'completed' && completedDate >= today;
      }).length;
      
      setSummary({
        totalWriters: writerStats.length,
        totalActiveJobs,
        totalCompletedToday: completedToday,
        totalRevisions,
        avgJobsPerWriter: writerStats.length > 0 ? totalActiveJobs / writerStats.length : 0
      });
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
      toast.error('Failed to load progress data');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchWriterJobs = async (writerId: number) => {
    try {
      setLoadingJobs(true);
      
      // PERFORMANCE FIX: Fetch only jobs for specific writer
      const response = await fetch(`/api/jobs?assignedFreelancerId=${writerId}`, {
        next: { revalidate: 10 }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      
      const jobsData = await response.json();
      
      // PERFORMANCE FIX: Batch fetch client names
      const uniqueClientIds = [...new Set(jobsData.map((job: Job) => job.clientId))];
      const clientPromises = uniqueClientIds.map(clientId =>
        fetch(`/api/users/${clientId}`).then(res => res.ok ? res.json() : null)
      );
      
      const clients = await Promise.all(clientPromises);
      const clientMap = Object.fromEntries(
        clients.filter(c => c).map(c => [c.id, c.name])
      );
      
      const jobsWithClients = jobsData.map((job: Job) => ({
        ...job,
        clientName: clientMap[job.clientId] || 'Unknown Client'
      }));
      
      jobsWithClients.sort((a, b) => 
        new Date(a.actualDeadline).getTime() - new Date(b.actualDeadline).getTime()
      );
      
      setWriterJobs(jobsWithClients);
    } catch (error) {
      console.error('Failed to fetch writer jobs:', error);
      toast.error('Failed to load writer jobs');
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleViewWriter = async (writer: Writer) => {
    setSelectedWriter(writer);
    setDialogOpen(true);
    await fetchWriterJobs(writer.id);
  };

  const getTimeUntilDeadline = (deadline: string | null | undefined, status: string) => {
    if (status === 'delivered' || status === 'completed') {
      return { text: 'Delivered', color: 'text-green-500', urgent: false };
    }
    
    if (!deadline) {
      return { text: 'No deadline', color: 'text-gray-500', urgent: false };
    }
    
    try {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      
      if (isNaN(deadlineDate.getTime())) {
        return { text: 'Invalid deadline', color: 'text-gray-500', urgent: false };
      }
      
      const hours = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      if (hours < 0) return { text: 'Overdue', color: 'text-red-500', urgent: true };
      if (hours < 6) return { text: `${hours}h left`, color: 'text-orange-500', urgent: true };
      if (hours < 24) return { text: `${hours}h left`, color: 'text-yellow-500', urgent: false };
      const days = Math.round(hours / 24);
      return { text: `${days}d left`, color: 'text-green-500', urgent: false };
    } catch (error) {
      return { text: 'Invalid deadline', color: 'text-gray-500', urgent: false };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500';
      case 'revision': return 'bg-orange-500/10 text-orange-500 border-orange-500';
      case 'editing': return 'bg-blue-500/10 text-blue-500 border-blue-500';
      case 'assigned': return 'bg-purple-500/10 text-purple-500 border-purple-500';
      case 'delivered': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500';
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <DashboardNav />
      <LeftNav role="admin" userName={user?.name || ''} userRole={user?.role || 'admin'} />
      <div className="min-h-screen bg-background ml-64">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Progress Summary</h1>
              <p className="text-muted-foreground">
                Track writer performance and current job progress
              </p>
            </div>
            <Link href="/admin/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Total Writers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary.totalWriters}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active freelancers</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    Active Jobs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary.totalActiveJobs}</div>
                  <p className="text-xs text-muted-foreground mt-1">In progress</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Completed Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary.totalCompletedToday}</div>
                  <p className="text-xs text-muted-foreground mt-1">Since midnight</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Revisions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary.totalRevisions}</div>
                  <p className="text-xs text-muted-foreground mt-1">Pending fixes</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-cyan-500" />
                    Avg Jobs/Writer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary.avgJobsPerWriter.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Current load</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Writers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Writers & Job Progress
              </CardTitle>
              <CardDescription>
                Click on a writer to view their current jobs and details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {writers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No writers found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {writers.map((writer) => (
                    <div
                      key={writer.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer hover:border-primary"
                      onClick={() => handleViewWriter(writer)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                            {writer.name.charAt(0).toUpperCase()}
                          </div>
                          
                          {/* Writer Info */}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{writer.name}</h3>
                            <p className="text-sm text-muted-foreground">{writer.email}</p>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {writer.activeJobs}
                              </div>
                              <p className="text-xs text-muted-foreground">Active Jobs</p>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {writer.completedJobs}
                              </div>
                              <p className="text-xs text-muted-foreground">Completed</p>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                KSh {writer.balance.toFixed(0)}
                              </div>
                              <p className="text-xs text-muted-foreground">Balance</p>
                            </div>
                            
                            {writer.rating && (
                              <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">
                                  ★ {writer.rating.toFixed(1)}
                                </div>
                                <p className="text-xs text-muted-foreground">Rating</p>
                              </div>
                            )}
                          </div>

                          {/* View Button */}
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {writer.activeJobs > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Workload</span>
                            <span>{writer.activeJobs} active {writer.activeJobs === 1 ? 'job' : 'jobs'}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                writer.activeJobs > 5 ? 'bg-red-500' :
                                writer.activeJobs > 3 ? 'bg-orange-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(writer.activeJobs * 20, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Writer Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {selectedWriter?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div>{selectedWriter?.name}</div>
                <div className="text-sm font-normal text-muted-foreground">
                  {selectedWriter?.email}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Current jobs and performance details
            </DialogDescription>
          </DialogHeader>

          {selectedWriter && (
            <div className="space-y-6">
              {/* Writer Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedWriter.activeJobs}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Active Jobs</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedWriter.completedJobs}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Completed</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        KSh {selectedWriter.balance.toFixed(0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Balance</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {selectedWriter.rating ? `★ ${selectedWriter.rating.toFixed(1)}` : 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Rating</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Jobs List */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Current Jobs ({writerJobs.length})
                </h3>

                {loadingJobs ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : writerJobs.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No jobs assigned to this writer
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {writerJobs.map((job) => {
                      const timeInfo = getTimeUntilDeadline(job.actualDeadline, job.status);
                      const freelancerAmount = job.amount * 0.7;
                      
                      return (
                        <Link key={job.id} href={`/admin/jobs/${job.id}`}>
                          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold">{job.title}</h4>
                                    <Badge variant="outline" className="text-xs">
                                      #{job.displayId}
                                    </Badge>
                                    <Badge className={`text-xs ${getStatusColor(job.status)}`}>
                                      {job.status === 'editing' ? 'Under Review' : job.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground capitalize">
                                    {job.workType} • {job.pages ? `${job.pages} pages` : ''} {job.slides ? `${job.slides} slides` : ''}
                                  </p>
                                </div>
                                <div className={`flex items-center gap-1 text-sm ${timeInfo.color} font-semibold`}>
                                  <Clock className="h-4 w-4" />
                                  {timeInfo.text}
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Client</p>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span className="font-medium">{job.clientName || 'Unknown'}</span>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span className="font-medium">
                                      {formatSafeDate(job.actualDeadline, 'MMM dd, HH:mm')}
                                    </span>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Client Amount</p>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3 text-green-600" />
                                    <span className="font-semibold text-green-600">
                                      KSh {job.amount.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Your Earning</p>
                                  <div className="flex items-center gap-1">
                                    <Package className="h-3 w-3 text-blue-600" />
                                    <span className="font-semibold text-blue-600">
                                      KSh {freelancerAmount.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Status indicators */}
                              <div className="flex gap-2 mt-3">
                                {job.revisionRequested && (
                                  <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-500 border-orange-500">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Revision Requested
                                  </Badge>
                                )}
                                {job.paymentConfirmed && (
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Payment Confirmed
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}