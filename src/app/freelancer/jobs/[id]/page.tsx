"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, AlertCircle, CheckCircle, Clock, ArrowLeft, Send, Download, FileText, MessageSquare, ClipboardList, Loader2, X, Link as LinkIcon, ExternalLink, Info } from 'lucide-react';
import { format } from 'date-fns';
import { CountdownTimer } from '@/components/countdown-timer';
import { toast } from 'sonner';
import Link from 'next/link';
import { calculateFreelancerAmount } from '@/lib/payment-calculations';
import { FileUploadSection } from '@/components/file-upload-section';

type Job = {
  id: number;
  displayId: string;
  clientId: number;
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
  revisionRequested: boolean;
  revisionNotes: string | null;
  createdAt: string;
  isRealOrder?: boolean;
};

type Message = {
  id: number;
  jobId: number;
  senderId: number;
  message: string;
  adminApproved: boolean;
  createdAt: string;
};

type Attachment = {
  id: number;
  jobId: number;
  uploadedBy: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadType: string;
  createdAt: string;
};

export default function FreelancerJobDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [orderSummary, setOrderSummary] = useState<{
    totalOrders: number;
    editingOrders: number;
    completedOrders: number;
    inProgressOrders: number;
  } | null>(null);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedUploadFiles, setSelectedUploadFiles] = useState<File[]>([]);
  const [submitWorkDialogOpen, setSubmitWorkDialogOpen] = useState(false);
  const [submitRevisionDialogOpen, setSubmitRevisionDialogOpen] = useState(false);
  
  // Link staging and submission states
  const [linkInput, setLinkInput] = useState('');
  const [stagedLinks, setStagedLinks] = useState<string[]>([]);
  const [submittingLinks, setSubmittingLinks] = useState(false);
  const [sharedLinks, setSharedLinks] = useState<Message[]>([]);

  // Safe date formatter to avoid RangeError on invalid dates
  const safeFormat = (dateStr?: string, fmt: string = 'MMM dd, yyyy HH:mm') => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : format(d, fmt);
  };

  useEffect(() => {
    if (user) {
      fetchJob();
      fetchMessages();
      fetchAttachments();
      fetchOrderSummary();
      fetchSharedLinks();
    }
  }, [user, jobId]);

  const fetchOrderSummary = async () => {
    try {
      const response = await fetch(`/api/jobs?assignedFreelancerId=${user?.id}`);
      if (response.ok) {
        const myJobs = await response.json();
        setOrderSummary({
          totalOrders: myJobs.length,
          editingOrders: myJobs.filter((j: Job) => j.status === 'editing').length,
          completedOrders: myJobs.filter((j: Job) => j.status === 'completed').length,
          inProgressOrders: myJobs.filter((j: Job) => j.status === 'in_progress').length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch order summary:', error);
    }
  };

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs?assignedFreelancerId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        const foundJob = data.find((j: Job) => j.id === parseInt(jobId));
        if (foundJob) {
          setJob(foundJob);
        } else {
          router.push('/freelancer/dashboard');
        }
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/messages?userRole=freelancer`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    }
  };

  const fetchSharedLinks = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/messages?userRole=freelancer&type=link`);
      if (response.ok) {
        const data = await response.json();
        setSharedLinks(data);
      }
    } catch (error) {
      console.error('Failed to fetch shared links:', error);
    }
  };

  const handleAddLinkToList = () => {
    if (!linkInput.trim()) {
      toast.error('Please enter a link');
      return;
    }

    try {
      new URL(linkInput.trim());
    } catch {
      toast.error('Please enter a valid URL (e.g., https://files.fm/u/...)');
      return;
    }

    setStagedLinks(prev => [...prev, linkInput.trim()]);
    setLinkInput('');
    toast.success('Link added to list');
  };

  const handleRemoveStagedLink = (index: number) => {
    setStagedLinks(prev => prev.filter((_, i) => i !== index));
    toast.info('Link removed from list');
  };

  const handleSubmitAllLinks = async () => {
    if (stagedLinks.length === 0) {
      toast.error('No links to submit');
      return;
    }

    setSubmittingLinks(true);
    try {
      for (const link of stagedLinks) {
        const response = await fetch(`/api/jobs/${jobId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: user?.id,
            message: link,
            messageType: 'link',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit link');
        }
      }

      toast.success(`${stagedLinks.length} link(s) submitted! Waiting for admin approval.`);
      setStagedLinks([]);
      fetchSharedLinks();
    } catch (error) {
      console.error('Failed to submit links:', error);
      toast.error('Failed to submit links. Please try again.');
    } finally {
      setSubmittingLinks(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          message: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage('');
        toast.success('Message sent successfully!');
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleStartWork = async () => {
    if (!job) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });

      if (response.ok) {
        toast.success('Work started! You can now begin working on this order.');
        fetchJob();
      }
    } catch (error) {
      console.error('Failed to start work:', error);
      toast.error('Failed to start work');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = async () => {
    if (selectedUploadFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploadingFiles(true);
    try {
      for (const file of selectedUploadFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('jobId', jobId);
        formData.append('uploadedBy', user?.id?.toString() || '');
        formData.append('uploadType', 'revision'); // Freelancer uploads

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      toast.success(`${selectedUploadFiles.length} file(s) uploaded successfully!`);
      setSelectedUploadFiles([]);
      fetchAttachments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files. Please try again.');
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    // All users can download all files - no restrictions
    toast.info(`Downloading ${attachment.fileName}...`);
    window.open(attachment.fileUrl, '_blank');
  };

  const handleSubmitWorkForReview = async () => {
    if (!job) return;
    
    // Check if there are files or approved links
    const hasFiles = attachments.length > 0;
    const hasApprovedLinks = sharedLinks.filter(m => m.adminApproved).length > 0;
    const hasPendingLinks = sharedLinks.filter(m => !m.adminApproved).length > 0;
    
    if (!hasFiles && !hasApprovedLinks && !hasPendingLinks) {
      toast.error('Please upload files or share links before submitting your work');
      return;
    }
    
    setProcessing(true);

    try {
      // Upload completed work - moves to "editing" status for admin review
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'editing',
          revisionRequested: false,
        }),
      });

      if (response.ok) {
        setSubmitWorkDialogOpen(false);
        toast.success('Work submitted for admin review! You will be notified once it\'s approved and delivered to the client.');
        fetchJob();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to submit work');
      }
    } catch (error) {
      console.error('Failed to submit work:', error);
      toast.error('Failed to submit work');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitRevision = async () => {
    if (!job) return;
    
    // Check if there are files or approved links
    const hasFiles = attachments.length > 0;
    const hasApprovedLinks = sharedLinks.filter(m => m.adminApproved).length > 0;
    const hasPendingLinks = sharedLinks.filter(m => !m.adminApproved).length > 0;
    
    if (!hasFiles && !hasApprovedLinks && !hasPendingLinks) {
      toast.error('Please upload revised files or share links before submitting');
      return;
    }
    
    setProcessing(true);

    try {
      // Submit revision - moves to "editing" status for admin review
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'editing',
          revisionRequested: false,
        }),
      });

      if (response.ok) {
        setSubmitRevisionDialogOpen(false);
        toast.success('Revised work submitted for admin review! You will be notified once it\'s approved and delivered to the client.');
        fetchJob();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to submit revision');
      }
    } catch (error) {
      console.error('Failed to submit revision:', error);
      toast.error('Failed to submit revision');
    } finally {
      setProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const displayStatus = job.status === 'editing' ? 'assigned' : job.status;
  const freelancerAmount = calculateFreelancerAmount(job.amount);
  const clientId = job.clientId;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-8 max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/freelancer/jobs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Orders
            </Button>
          </Link>
        </div>

        {/* Order Summary Card */}
        {orderSummary && (
          <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                My Order Summary
              </CardTitle>
              <CardDescription>
                Overview of all your assigned orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-background rounded-lg border">
                  <p className="text-3xl font-bold text-primary">{orderSummary.totalOrders}</p>
                  <p className="text-sm text-muted-foreground mt-1">Total Orders</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg border">
                  <p className="text-3xl font-bold text-yellow-600">{orderSummary.inProgressOrders}</p>
                  <p className="text-sm text-muted-foreground mt-1">In Progress</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg border">
                  <p className="text-3xl font-bold text-blue-600">{orderSummary.editingOrders}</p>
                  <p className="text-sm text-muted-foreground mt-1">Under Review</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg border">
                  <p className="text-3xl font-bold text-green-600">{orderSummary.completedOrders}</p>
                  <p className="text-sm text-muted-foreground mt-1">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header with Status Badge */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
              <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                <span>Assigned on {safeFormat(job.createdAt, 'MMM dd, yyyy')}</span>
                {job.displayId && (
                  <Badge variant="outline" className="font-mono">
                    {job.displayId}
                  </Badge>
                )}
              </div>
            </div>
            <Badge
              className="capitalize text-lg px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {displayStatus.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Countdown Timer */}
        {job.freelancerDeadline && (
          <div className="mb-6">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-muted-foreground">Your Deadline</Label>
                    <p className="font-medium text-lg">{safeFormat(job.freelancerDeadline, 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  <CountdownTimer deadline={job.freelancerDeadline} colorScheme="green" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Info */}
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Work Type</Label>
                    <p className="font-medium capitalize">{job.workType}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Your Payment (70% of KSh {job.amount.toFixed(2)})</Label>
                    <p className="font-semibold text-lg text-green-600">KSh {freelancerAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">You receive 70% of the order value</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Pages / Slides</Label>
                    <p className="font-medium">
                      {job.pages ? `${job.pages} pages` : ''} 
                      {job.pages && job.slides ? ' + ' : ''}
                      {job.slides ? `${job.slides} slides` : ''}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Deadline</Label>
                    <p className="font-medium">{safeFormat(job.freelancerDeadline, 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Instructions</Label>
                  <p className="mt-2 text-sm whitespace-pre-wrap">{job.instructions}</p>
                </div>
              </CardContent>
            </Card>

            {/* FILE UPLOAD SECTION */}
            <FileUploadSection
              jobId={parseInt(jobId)}
              currentUserId={user?.id || 0}
              currentUserRole="freelancer"
              files={attachments.map(att => ({
                id: att.id,
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileSize: att.fileSize,
                fileType: att.fileType,
                uploadType: att.uploadType,
                uploadedBy: att.uploadedBy,
                createdAt: att.createdAt,
              }))}
              canUpload={displayStatus !== 'cancelled'}
              canDownload={true}
              uploadType="revision"
              onFileUploaded={fetchAttachments}
              currentJobType={job.workType}
              clientId={clientId}
            />

            {/* Status Alerts & Actions */}
            {displayStatus === 'assigned' && (
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    Ready to Start
                  </CardTitle>
                  <CardDescription>
                    This job has been assigned to you. Click below to start working on it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button onClick={handleStartWork} disabled={processing}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Start Working
                  </Button>
                </CardContent>
              </Card>
            )}

            {displayStatus === 'in_progress' && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-green-600" />
                    In Progress
                  </CardTitle>
                  <CardDescription>
                    You're currently working on this job. Upload files and share links below, then click "Submit Work for Review" when ready.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setSubmitWorkDialogOpen(true)}
                    size="lg"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Work for Review
                  </Button>
                </CardContent>
              </Card>
            )}

            {displayStatus === 'revision' && job.revisionRequested && (
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
                    Revision Requested
                  </CardTitle>
                  <CardDescription>
                    The client has requested revisions to your work.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Client's Feedback:</Label>
                    <div className="mt-2 p-3 bg-background rounded-lg border">
                      <p className="text-sm">{job.revisionNotes}</p>
                    </div>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>How to submit revisions:</strong> Upload your revised files below, then click "Submit Revised Work" to send them for admin review.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={() => setSubmitRevisionDialogOpen(true)}
                    size="lg"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Revised Work for Review
                  </Button>
                </CardContent>
              </Card>
            )}

            {displayStatus === 'delivered' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your work has been delivered to the client. You'll receive payment once they approve it.
                </AlertDescription>
              </Alert>
            )}

            {displayStatus === 'completed' && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Job Completed!
                  </CardTitle>
                  <CardDescription>
                    This job has been completed and the payment of KSh {freelancerAmount.toFixed(2)} has been added to your balance.
                    <br />
                    <strong className="text-primary">You can still view all files and add additional uploads if needed.</strong>
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Share Links Section */}
            <Card className="border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Share Links
                </CardTitle>
                <CardDescription>
                  Submit download links from Files.fm or Google Drive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-300">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Quick Steps:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>Click "Upload to Files.fm" button below</li>
                      <li>Upload your files and copy the share link</li>
                      <li>Paste the link here and click "Add Link to List"</li>
                      <li>Click "Submit All Links" when ready</li>
                    </ol>
                    <p className="mt-2 text-xs">Your links will be reviewed by admin before client delivery.</p>
                  </AlertDescription>
                </Alert>

                {/* Upload to Files.fm Button */}
                <Button
                  onClick={() => window.open('https://files.fm', '_blank', 'noopener,noreferrer')}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                  size="lg"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Upload to Files.fm
                </Button>

                {/* Link Input */}
                <div className="space-y-2">
                  <Label htmlFor="linkInput">Paste Your Download Link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="linkInput"
                      type="url"
                      placeholder="https://files.fm/u/... or Google Drive link"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLinkToList();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleAddLinkToList}
                      disabled={!linkInput.trim()}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Add to List
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supports Files.fm, Google Drive, Dropbox, or any direct download link
                  </p>
                </div>

                {/* Staged Links List */}
                {stagedLinks.length > 0 && (
                  <div className="space-y-2">
                    <Label>Links Ready to Submit ({stagedLinks.length})</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {stagedLinks.map((link, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border">
                          <a 
                            href={link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 text-sm text-blue-600 hover:underline truncate"
                          >
                            {link}
                          </a>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveStagedLink(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={handleSubmitAllLinks}
                      disabled={submittingLinks}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {submittingLinks ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit All Links ({stagedLinks.length})
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Pending Links */}
                {sharedLinks.filter(m => !m.adminApproved).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-yellow-700 dark:text-yellow-400">Pending Admin Approval</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sharedLinks.filter(m => !m.adminApproved).map((msg) => (
                        <div key={msg.id} className="flex items-center gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-300">
                          <div className="flex-1">
                            <a 
                              href={msg.message} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline break-all"
                            >
                              {msg.message}
                            </a>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Waiting for approval
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {safeFormat(msg.createdAt, 'MMM dd, HH:mm')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approved Links */}
                {sharedLinks.filter(m => m.adminApproved).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-green-700 dark:text-green-400">Delivered Links</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sharedLinks.filter(m => m.adminApproved).map((msg) => (
                        <div key={msg.id} className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200">
                          <div className="flex-1">
                            <a 
                              href={msg.message} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline break-all"
                            >
                              {msg.message}
                            </a>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Delivered
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {safeFormat(msg.createdAt, 'MMM dd, HH:mm')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Messages & Quick File Access */}
          <div className="lg:col-span-1 space-y-6">
            {/* Messages Section - ALWAYS VISIBLE */}
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Messages
                </CardTitle>
                <CardDescription>Chat with the client and admin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-96 overflow-y-auto border rounded-lg p-3 space-y-3 bg-muted/30">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">No messages yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Start a conversation below</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        let isLink = false;
                        try {
                          new URL(msg.message);
                          isLink = true;
                        } catch {}

                        const isSent = msg.senderId === user?.id;

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`p-2 rounded-lg max-w-[85%] ${
                                isSent
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-background border'
                              }`}
                            >
                              {isLink ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <LinkIcon className="w-3 h-3" />
                                    <span className="text-xs font-medium">Link</span>
                                  </div>
                                  <a 
                                    href={msg.message} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs hover:underline break-all block"
                                  >
                                    {msg.message}
                                  </a>
                                </div>
                              ) : (
                                <p className="text-sm">{msg.message}</p>
                              )}
                              <p className="text-xs opacity-70 mt-1">
                                {safeFormat(msg.createdAt, 'MMM dd, HH:mm')}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="resize-none"
                      rows={2}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || processing}
                      className="w-full"
                      size="sm"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Messages are reviewed by admin before delivery
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick File Access */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Quick File Access
                </CardTitle>
                <CardDescription>
                  Download any file instantly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attachments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No files uploaded yet
                    </p>
                  ) : (
                    attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {attachment.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.fileSize)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="ml-2 capitalize text-xs">
                            {attachment.uploadType}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {safeFormat(attachment.createdAt, 'MMM dd, HH:mm')}
                          </span>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDownloadAttachment(attachment)}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Work for Review Dialog */}
      <Dialog open={submitWorkDialogOpen} onOpenChange={setSubmitWorkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Work for Admin Review</DialogTitle>
            <DialogDescription>
              Your work will be reviewed by the admin before being delivered to the client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Before Submitting:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Ensure you've uploaded all required files OR shared Files.fm links</li>
                  <li>Double-check your work meets all the requirements</li>
                  <li>Admin will review before delivering to client</li>
                  <li>You'll be notified once approved</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Files Uploaded:</span>
                <Badge variant="outline">{attachments.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Links Shared:</span>
                <Badge variant="outline">{sharedLinks.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Links Approved:</span>
                <Badge variant="outline">{sharedLinks.filter(m => m.adminApproved).length}</Badge>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Your Earnings (70%):</span>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                  KSh {freelancerAmount.toFixed(2)}
                </Badge>
              </div>
            </div>

            {attachments.length === 0 && sharedLinks.length === 0 && (
              <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> You haven't uploaded any files or shared any links yet. 
                  Please add your completed work before submitting.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitWorkDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitWorkForReview} 
              disabled={processing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit for Review
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Revision Dialog */}
      <Dialog open={submitRevisionDialogOpen} onOpenChange={setSubmitRevisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Revised Work for Admin Review</DialogTitle>
            <DialogDescription>
              Your revised work will be reviewed by the admin before being delivered to the client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Before Submitting:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Ensure you've uploaded all revised files OR shared Files.fm links</li>
                  <li>Double-check you've addressed all client feedback</li>
                  <li>Admin will review before delivering to client</li>
                  <li>You'll be notified once approved</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Files Uploaded:</span>
                <Badge variant="outline">{attachments.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Links Shared:</span>
                <Badge variant="outline">{sharedLinks.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Links Approved:</span>
                <Badge variant="outline">{sharedLinks.filter(m => m.adminApproved).length}</Badge>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Your Earnings (70%):</span>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                  KSh {freelancerAmount.toFixed(2)}
                </Badge>
              </div>
            </div>

            {attachments.length === 0 && sharedLinks.length === 0 && (
              <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> You haven't uploaded any files or shared any links yet. 
                  Please add your revised work before submitting.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitRevisionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitRevision} 
              disabled={processing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Revision for Review
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}