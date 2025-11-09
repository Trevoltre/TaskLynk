"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { LeftNav } from '@/components/left-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileEdit, Download, Send, CheckCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

type Revision = {
  id: number;
  jobId: number;
  submittedBy: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  revisionNotes: string | null;
  status: string;
  sentToFreelancer: boolean;
  approvedByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  job: {
    id: number;
    displayId: string;
    title: string;
    clientId: number;
  } | null;
  submitter: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
};

export default function AdminRevisionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [filteredRevisions, setFilteredRevisions] = useState<Revision[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        fetchRevisions();
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Filter revisions based on status and search term
    let filtered = revisions;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        (r.job?.displayId?.toLowerCase()?.includes(term) ?? false) ||
        (r.job?.title?.toLowerCase()?.includes(term) ?? false) ||
        (r.fileName?.toLowerCase()?.includes(term) ?? false) ||
        (r.submitter?.name?.toLowerCase()?.includes(term) ?? false)
      );
    }

    setFilteredRevisions(filtered);
  }, [statusFilter, searchTerm, revisions]);

  const fetchRevisions = async () => {
    try {
      setLoadingData(true);
      const response = await fetch('/api/revisions');
      if (response.ok) {
        const data = await response.json();
        setRevisions(Array.isArray(data) ? data : []);
        setFilteredRevisions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch revisions:', error);
      toast.error('Failed to load revisions');
    } finally {
      setLoadingData(false);
    }
  };

  const handleApprove = async (revisionId: number) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/revisions/${revisionId}/approve`, {
        method: 'PATCH',
      });

      if (response.ok) {
        toast.success('Revision approved successfully!');
        fetchRevisions();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to approve revision');
      }
    } catch (error) {
      console.error('Failed to approve revision:', error);
      toast.error('Failed to approve revision');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendToFreelancer = async (revisionId: number) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/revisions/${revisionId}/send-to-freelancer`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Revision sent to freelancer successfully!');
        fetchRevisions();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to send revision');
      }
    } catch (error) {
      console.error('Failed to send revision:', error);
      toast.error('Failed to send revision');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = (revision: Revision) => {
    if (!revision?.fileUrl) {
      toast.error('File URL missing');
      return;
    }
    window.open(revision.fileUrl, '_blank');
    toast.info(`Downloading ${revision.fileName || 'file'}...`);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'sent_to_freelancer':
        return 'outline';
      case 'completed':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'sent_to_freelancer':
        return 'Sent to Freelancer';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  if (!mounted || loading || loadingData) {
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
        userName={user?.name || ''} 
        userRole={user?.role || 'admin'}
      />
      <div className="min-h-screen bg-background ml-64 transition-all duration-300">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <a href="https://files.fm" target="_blank" rel="noopener noreferrer" className="ml-auto">
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Upload to Files.fm
                </Button>
              </a>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <FileEdit className="w-8 h-8" />
                  Revisions Management
                </h1>
                <p className="text-muted-foreground">
                  Review, approve, and send revisions to freelancers
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Filter and search revisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by order ID, title, file name, or submitter..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="sent_to_freelancer">Sent to Freelancer</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revisions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Revisions ({filteredRevisions.length})</CardTitle>
              <CardDescription>
                All revision submissions from freelancers and admins
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRevisions.length === 0 ? (
                <div className="text-center py-12">
                  <FileEdit className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No revisions found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Revisions will appear here once submitted'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Submitted By</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRevisions.map((revision) => (
                        <TableRow key={revision.id}>
                          <TableCell>
                            <div>
                              {revision.job ? (
                                <Link 
                                  href={`/admin/jobs/${revision.job?.id ?? revision.jobId}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {revision.job.displayId || `JOB-${revision.jobId}`}
                                </Link>
                              ) : (
                                <span className="font-medium">{`JOB-${revision.jobId}`}</span>
                              )}
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {revision.job?.title || '-'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm truncate max-w-[150px]">
                                {revision.fileName || 'Untitled'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(revision.fileSize)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{revision.submitter?.name || 'Unknown'}</p>
                              <Badge variant="outline" className="text-xs capitalize">
                                {revision.submitter?.role || 'user'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {revision.revisionNotes ? (
                              <p className="text-sm truncate max-w-[200px]">
                                {revision.revisionNotes}
                              </p>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(revision.status)}>
                              {getStatusLabel(revision.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {revision.createdAt ? format(new Date(revision.createdAt), 'MMM dd, yyyy') : '-'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {revision.createdAt ? format(new Date(revision.createdAt), 'HH:mm') : ''}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownload(revision)}
                                disabled={!revision.fileUrl}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              {revision.status === 'pending_review' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApprove(revision.id)}
                                  disabled={processing}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                              )}
                              {(revision.status === 'approved' || revision.status === 'pending_review') && !revision.sentToFreelancer && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSendToFreelancer(revision.id)}
                                  disabled={processing}
                                >
                                  <Send className="w-4 h-4 mr-1" />
                                  Send
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}