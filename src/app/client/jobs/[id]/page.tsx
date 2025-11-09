"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, DollarSign, AlertCircle, Download, MessageSquare, Send, Star, Clock, ArrowLeft, Edit, Phone, Link as LinkIcon, Loader2, X, ExternalLink, Info, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CountdownTimer } from '@/components/countdown-timer';
import { ClientOrderEditDialog } from '@/components/client-order-edit-dialog';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { RevisionTimeSelector } from '@/components/revision-time-selector';
import Link from 'next/link';
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
  actualDeadline: string;
  status: string;
  assignedFreelancerId: number | null;
  adminApproved: boolean;
  clientApproved: boolean;
  revisionRequested: boolean;
  revisionNotes: string | null;
  paymentConfirmed: boolean;
  clientRating: number | null;
  createdAt: string;
  isRealOrder?: boolean;
};

type Attachment = {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadType: string;
  createdAt: string;
  uploadedBy: number;
};

type Message = {
  id: number;
  senderId: number;
  message: string;
  createdAt: string;
};

export default function ClientJobDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showRevisionConfirm, setShowRevisionConfirm] = useState(false);
  const [revisionHours, setRevisionHours] = useState<number>(2);
  const [ratingOnlyMode, setRatingOnlyMode] = useState<boolean>(false);
  
  // Link sharing states
  const [linkInput, setLinkInput] = useState('');
  const [stagedLinks, setStagedLinks] = useState<string[]>([]);
  const [submittingLinks, setSubmittingLinks] = useState(false);
  
  // M-Pesa payment form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [lastPaymentPhone, setLastPaymentPhone] = useState<string | null>(null);
  const [lastPaymentAmount, setLastPaymentAmount] = useState<number | null>(null);
  const [autoApproveTimer, setAutoApproveTimer] = useState<number | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  const isValidPhone = (() => {
    const raw = (phoneNumber || '').replace(/\s|-/g, '').replace(/^\+/, '');
    return (
      /^0[17]\d{8}$/.test(raw) ||
      /^[17]\d{8}$/.test(raw) ||
      /^254[17]\d{8}$/.test(raw)
    );
  })();

  useEffect(() => {
    if (user) {
      fetchJob();
      fetchAttachments();
      fetchMessages();
      fetchPayment();
    }
  }, [user, jobId]);

  useEffect(() => {
    if (!job) return;
    const status = job.status === 'editing' ? 'assigned' : job.status;
    const isEligible = status === 'delivered' && job.paymentConfirmed && !job.clientApproved;

    if (isEligible && !autoApproveTimer) {
      const id = window.setTimeout(() => {
        handleApprove();
      }, 3 * 60 * 1000);
      setAutoApproveTimer(id);
      toast.message('Payment confirmed. Auto-approving in 3 minutes unless you approve sooner.');
    }

    if (!isEligible && autoApproveTimer) {
      window.clearTimeout(autoApproveTimer);
      setAutoApproveTimer(null);
    }
  }, [job?.paymentConfirmed, job?.clientApproved, job?.status]);

  useEffect(() => {
    return () => {
      if (autoApproveTimer) {
        window.clearTimeout(autoApproveTimer);
      }
    };
  }, [autoApproveTimer]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimeStatus = () => {
    if (!job) return { belowSixHours: false, totalHours: 0 };
    
    // If delivered or completed, never show red
    const displayStatus = job.status === 'editing' ? 'assigned' : job.status;
    if (displayStatus === 'delivered' || displayStatus === 'completed') {
      return { belowSixHours: false, totalHours: 999 };
    }
    
    const due = new Date(job.actualDeadline);
    const diffMs = due.getTime() - currentTime.getTime();
    
    if (diffMs <= 0) {
      return { belowSixHours: true, totalHours: 0 };
    }
    
    const totalHours = diffMs / (1000 * 60 * 60);
    return { belowSixHours: totalHours < 6, totalHours };
  };

  const fetchJob = async () => {
    try {
      // CRITICAL FIX: Fetch the specific job directly by ID to ensure we get the right one
      const response = await fetch(`/api/jobs/${jobId}`);
      if (response.ok) {
        const foundJob = await response.json();
        // Verify this job belongs to the current client
        if (foundJob && foundJob.clientId === user?.id) {
          setJob(foundJob);
        } else {
          toast.error('Job not found or access denied');
          router.push('/client/dashboard');
        }
      } else {
        toast.error('Failed to load job details');
        router.push('/client/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
      toast.error('Error loading job details');
      router.push('/client/dashboard');
    } finally {
      setLoading(false);
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

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/messages?userRole=client`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchPayment = async () => {
    try {
      const response = await fetch(`/api/payments?jobId=${jobId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setPaymentId(data[0].id);
          setLastPaymentAmount(typeof data[0].amount === 'number' ? data[0].amount : parseFloat(data[0].amount));
          if (data[0].phoneNumber) {
            setLastPaymentPhone(data[0].phoneNumber as string);
            if (!phoneNumber) setPhoneNumber(data[0].phoneNumber as string);
          } else {
            const withPhone = data.find((p: { phoneNumber?: string | null }) => !!p.phoneNumber);
            if (withPhone?.phoneNumber) {
              setLastPaymentPhone(withPhone.phoneNumber as string);
              if (!phoneNumber) setPhoneNumber(withPhone.phoneNumber as string);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment:', error);
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
      fetchMessages();
    } catch (error) {
      console.error('Failed to submit links:', error);
      toast.error('Failed to submit links. Please try again.');
    } finally {
      setSubmittingLinks(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user?.id,
          message: newMessage,
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
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveClick = () => {
    // Open approval dialog with rating requirement
    setRatingOnlyMode(false);
    setApprovalDialogOpen(true);
    setRating(0);
    setReviewComment('');
  };

  const handleOpenRateOnly = () => {
    setRatingOnlyMode(true);
    setApprovalDialogOpen(true);
    setRating(0);
    setReviewComment('');
  };

  const handleApprove = async () => {
    if (!job) return;
    
    setProcessing(true);

    try {
      if (!job.paymentConfirmed) {
        toast.error('Payment must be completed and confirmed before approving the work. Please complete payment first.');
        setProcessing(false);
        return;
      }

      // Approve the job without rating requirement
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'completed',
          clientApproved: true,
        }),
      });

      if (response.ok) {
        toast.success('Work approved successfully! Order moved to completed.');
        fetchJob();
      } else {
        toast.error('Failed to approve work. Please try again.');
      }
    } catch (error) {
      console.error('Failed to approve job:', error);
      toast.error('Failed to approve work. Please try again.');
    } finally {
      setProcessing(false);
      if (autoApproveTimer) {
        window.clearTimeout(autoApproveTimer);
        setAutoApproveTimer(null);
      }
    }
  };

  const handleApproveWithRating = async () => {
    if (!job) return;
    
    // Validate rating is provided
    if (rating === 0) {
      toast.error('Please provide a rating (1-5 stars) for the writer');
      return;
    }

    setProcessing(true);

    try {
      if (!job.paymentConfirmed) {
        toast.error('Payment must be completed and confirmed before approving the work. Please complete payment first.');
        setProcessing(false);
        return;
      }

      // First, submit the rating
      const ratingResponse = await fetch(`/api/jobs/${job.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratedByUserId: user?.id,
          ratedUserId: job.assignedFreelancerId,
          score: rating,
          comment: reviewComment.trim() || null,
        }),
      });

      if (!ratingResponse.ok) {
        toast.error('Failed to submit rating. Please try again.');
        setProcessing(false);
        return;
      }

      // Then, approve the job
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'completed',
          clientApproved: true,
        }),
      });

      if (response.ok) {
        setApprovalDialogOpen(false);
        toast.success('Work approved successfully! Rating submitted. Order moved to completed.');
        fetchJob();
      } else {
        toast.error('Failed to approve work. Please try again.');
      }
    } catch (error) {
      console.error('Failed to approve job:', error);
      toast.error('Failed to approve work. Please try again.');
    } finally {
      setProcessing(false);
      if (autoApproveTimer) {
        window.clearTimeout(autoApproveTimer);
        setAutoApproveTimer(null);
      }
    }
  };

  const handleSubmitRatingOnly = async () => {
    if (!job) return;
    if (rating === 0) {
      toast.error('Please provide a rating (1-5 stars)');
      return;
    }
    setProcessing(true);
    try {
      const ratingResponse = await fetch(`/api/jobs/${job.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratedByUserId: user?.id,
          ratedUserId: job.assignedFreelancerId,
          score: rating,
          comment: reviewComment.trim() || null,
        }),
      });
      if (!ratingResponse.ok) {
        toast.error('Failed to submit rating. Please try again.');
        setProcessing(false);
        return;
      }
      setApprovalDialogOpen(false);
      toast.success('Rating submitted successfully');
      fetchJob();
    } catch (e) {
      console.error(e);
      toast.error('Failed to submit rating');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevisionDialogOpen = () => {
    setRevisionDialogOpen(true);
  };

  const handleRequestRevisionConfirm = () => {
    if (!revisionNotes.trim()) {
      toast.error('Please provide revision notes');
      return;
    }
    setShowRevisionConfirm(true);
  };

  const handleRequestRevision = async () => {
    if (!job || !revisionNotes.trim()) return;
    setShowRevisionConfirm(false);
    setProcessing(true);

    try {
      const response = await fetch(`/api/jobs/${job.id}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revisionNotes: revisionNotes,
          requestedBy: 'client',
          revisionHours: revisionHours,
        }),
      });

      if (response.ok) {
        setRevisionDialogOpen(false);
        setRevisionNotes('');
        toast.success('Revision request sent to admin for approval');
        fetchJob();
      }
    } catch (error) {
      console.error('Failed to request revision:', error);
      toast.error('Failed to request revision');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentInitiate = async () => {
    if (!user?.id || !job?.id) {
      toast.error('Please sign in again and retry payment');
      return;
    }

    const inputPhone = phoneNumber?.trim();

    if (!inputPhone) {
      toast.error('Please enter your M-Pesa phone number');
      return;
    }

    setPaymentProcessing(true);

    try {
      const raw = inputPhone.replace(/[\s-]/g, '').replace(/^\+/, '');
      let formattedPhone = raw;
      if (/^0[17]\d{8}$/.test(raw)) {
        formattedPhone = '254' + raw.slice(1);
      } else if (/^[17]\d{8}$/.test(raw)) {
        formattedPhone = '254' + raw;
      } else if (/^254[17]\d{8}$/.test(raw)) {
        formattedPhone = raw;
      } else {
        setPaymentProcessing(false);
        toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678 or 254712345678)');
        return;
      }

      const amountToPay = Math.round(job.amount);

      const response = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          amount: amountToPay,
          jobId: job.id,
          userId: Number(user.id),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Payment request sent! Please check your phone to complete the payment.', {
          description: 'Enter your M-Pesa PIN to confirm the payment.',
          duration: 10000,
        });
        
        pollPaymentStatus(data.checkoutRequestId);
      } else {
        console.error('STK initiation failed:', data);
        const detail = data?.details || data?.error || data?.responseDescription || data?.ResponseDescription || '';
        const hint = data?.hint ? ` (${String(data.hint)})` : '';
        toast.error(`Failed to initiate payment. Please try again.${detail ? ' ' + String(detail) : ''}${hint}`);
        setPaymentProcessing(false);
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setPaymentProcessing(false);
    }
  };

  const pollPaymentStatus = async (checkoutRequestId: string) => {
    let attempts = 0;
    const maxAttempts = 90;

    const poll = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch('/api/mpesa/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutRequestId }),
        });

        const data = await response.json();

        const resultCode = String(data.ResultCode ?? data.resultCode ?? '');
        const isCompleted = resultCode === '0' || data.status === 'completed';

        if (isCompleted) {
          clearInterval(poll);
          setPaymentProcessing(false);
          setPhoneNumber('');
          
          toast.success('Payment completed successfully!', {
            description: 'You can now download the completed files.',
            duration: 6000,
          });

          await fetchJob();
          await fetchAttachments();
          await fetchPayment();

          if (job && !job.clientApproved) {
            if (autoApproveTimer) {
              window.clearTimeout(autoApproveTimer);
            }
            const id = window.setTimeout(() => {
              handleApprove();
            }, 3 * 60 * 1000);
            setAutoApproveTimer(id);
          }
        } else if (resultCode && resultCode !== '0') {
          clearInterval(poll);
          setPaymentProcessing(false);
          const failDesc = data.ResultDesc || data.ResponseDescription || data.details || 'Transaction was not completed';
          toast.error('Payment failed: ' + failDesc);
        } else if (attempts >= maxAttempts) {
          clearInterval(poll);
          setPaymentProcessing(false);
          toast.error('Payment verification timeout. Please contact support if amount was deducted.');
        }
      } catch (error) {
        console.error('Payment polling error:', error);
      }
    }, 2000);
  };

  const handleDownload = (attachment: Attachment) => {
    if (attachment.uploadType !== 'initial' && !job?.paymentConfirmed) {
      toast.error('Please complete payment to download completed files');
      return;
    }
    
    toast.info(`Downloading ${attachment.fileName}...`);
    
    // Use the proxy endpoint for secure downloads with signed URLs
    window.open(`/api/files/download/${attachment.id}`, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
  const payAmount = Math.round(job.amount);
  const timeStatus = getTimeStatus();

  // UPDATED: Only show client's own initial uploads and admin final files to client
  const visibleAttachments = attachments.filter(att => {
    // Client's own uploads (initial) are always visible
    if (att.uploadType === 'initial' || att.uploadedBy === user?.id) return true;
    // Show only admin-delivered final files
    return att.uploadType === 'final';
  });

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/client/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Header with Status Badge */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {job.title}
              </h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>Posted on {format(new Date(job.createdAt), 'MMM dd, yyyy')}</span>
                {job.displayId && (
                  <Badge variant="outline" className="font-mono">
                    {job.displayId}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  className="ml-2"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Order
                </Button>
              </div>
            </div>
            <div className={`${timeStatus.belowSixHours ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500' : 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500'} rounded-lg px-6 py-3`}>
              <Badge
                variant={
                  displayStatus === 'completed' ? 'default' :
                  displayStatus === 'cancelled' ? 'destructive' :
                  'secondary'
                }
                className={`capitalize text-xl px-4 py-2 ${timeStatus.belowSixHours ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
              >
                {displayStatus.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Details */}
            <Card className={timeStatus.belowSixHours ? 'border-2 border-red-500' : ''}>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Work Type</Label>
                    <p className="font-medium">{job.workType}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Pages / Slides</Label>
                    <p className="font-medium">
                      {job.pages ? `${job.pages} pages` : ''} 
                      {job.pages && job.slides ? ' + ' : ''}
                      {job.slides ? `${job.slides} slides` : ''}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Deadline</Label>
                    <p className="font-medium">
                      {format(new Date(job.actualDeadline), 'MMM dd, yyyy HH:mm')}
                    </p>
                    <CountdownTimer deadline={job.actualDeadline} status={displayStatus} />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Amount</Label>
                    <p className="font-semibold text-lg text-green-600">
                      KSh {job.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Instructions</Label>
                  <p className="mt-2 text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                    {job.instructions}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Files Section with proper categorization */}
            <FileUploadSection
              jobId={parseInt(jobId)}
              currentUserId={user?.id || 0}
              currentUserRole="client"
              files={visibleAttachments.map((att) => ({
                id: att.id,
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileSize: att.fileSize,
                fileType: att.fileType,
                uploadType: att.uploadType,
                uploadedBy: att.uploadedBy ?? 0,
                createdAt: att.createdAt,
              }))}
              canUpload={true}
              canDownload={true}
              uploadType="initial"
              onFileUploaded={fetchAttachments}
              currentJobType={job.workType}
              clientId={job.clientId}
            />

            {/* Payment Information Card */}
            {displayStatus === 'delivered' && (
              <Card className="mb-6 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-600 rounded-full">
                        <Smartphone className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-green-900 dark:text-green-100">Send Money / Payment Information</CardTitle>
                        <CardDescription className="text-green-700 dark:text-green-300">
                          Use M-Pesa to make payments for your orders
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800">
                      <Phone className="h-8 w-8 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">Send payment to this number:</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400 tracking-wider">
                          0701066845
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('0701066845');
                          toast.success('Phone number copied to clipboard!');
                        }}
                        className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                      >
                        Copy Number
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Send payment via M-Pesa Lipa Na M-Pesa (Paybill/Till) or direct to the number above</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Admin will confirm payment upon receiving</strong> - Once confirmed, your order will be marked as completed</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>After admin confirmation, you can download your completed order files</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Keep your M-Pesa transaction reference for payment verification</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Section */}
            {displayStatus === 'delivered' && !job.paymentConfirmed && (
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Complete Payment
                  </CardTitle>
                  <CardDescription>
                    Pay via M-Pesa to unlock completed files
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Amount:</span>
                      <span className="text-2xl font-bold text-green-600">
                        KSh {payAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">M-Pesa Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="e.g., 0712345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={paymentProcessing}
                      className="text-lg"
                    />
                  </div>

                  {paymentProcessing && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Payment request sent! Check your phone and enter your M-Pesa PIN.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handlePaymentInitiate}
                    disabled={paymentProcessing || !isValidPhone}
                    className="w-full text-white bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {paymentProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-5 h-5 mr-2" />
                        Pay KSh {payAmount.toFixed(2)}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Actions when delivered */}
            {displayStatus === 'delivered' && job.paymentConfirmed && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Work</CardTitle>
                  <CardDescription>
                    Rate the writer and approve the work, or request revisions
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button onClick={handleApproveClick} disabled={processing || job.clientApproved}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {job.clientApproved ? 'Approved' : 'Approve & Rate Work'}
                  </Button>
                  <Button variant="outline" onClick={handleRevisionDialogOpen} disabled={processing}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Request Revision
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* When completed - allow rating button */}
            {displayStatus === 'completed' && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Completed</CardTitle>
                  <CardDescription>You can still rate your experience with the writer</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button onClick={() => handleOpenRateOnly()} disabled={processing}>
                    <Star className="w-4 h-4 mr-2" />
                    Rate Order
                  </Button>
                  <Button variant="outline" onClick={handleRevisionDialogOpen} disabled={processing}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Request Revision
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Share Links Section */}
            <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-100">
                  <LinkIcon className="w-5 h-5" />
                  Share External Links (Optional)
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  Share external links (Google Drive, Files.fm, etc.) - Requires admin approval
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-green-100 dark:bg-green-900/30 border-green-400">
                  <AlertCircle className="h-4 w-4 text-green-700" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    <strong>Note:</strong> You can now upload files directly using the Files section above. Use this only for sharing external links from services like Google Drive or Files.fm.
                  </AlertDescription>
                </Alert>

                {/* Link Input */}
                <div className="space-y-2">
                  <Label htmlFor="linkInput" className="text-green-800 dark:text-green-200">Paste External Link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="linkInput"
                      type="url"
                      placeholder="https://drive.google.com/... or https://files.fm/u/..."
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLinkToList();
                        }
                      }}
                      className="flex-1 border-green-300 focus:border-green-500"
                    />
                    <Button 
                      onClick={handleAddLinkToList}
                      disabled={!linkInput.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Add to List
                    </Button>
                  </div>
                </div>

                {/* Staged Links List */}
                {stagedLinks.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-green-800 dark:text-green-200">Links Ready ({stagedLinks.length})</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {stagedLinks.map((link, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border border-green-300">
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
                      className="w-full bg-green-600 hover:bg-green-700"
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
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Messages - ALWAYS VISIBLE */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Messages
                </CardTitle>
                <CardDescription>Chat with the freelancer and admin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`h-96 overflow-y-auto border rounded-lg p-3 space-y-3 bg-muted/30 ${timeStatus.belowSixHours ? 'border-red-500' : ''}`}>
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
                                {format(new Date(msg.createdAt), 'MMM dd, HH:mm')}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button size="icon" onClick={handleSendMessage} disabled={processing || !newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Messages are reviewed by admin before delivery
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <ClientOrderEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        job={job}
        onEdit={(updatedJob) => {
          setJob(updatedJob);
          toast.success('Order updated successfully!');
          fetchJob();
        }}
      />

      {/* Revision Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Explain what needs to be revised
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="revisionNotes">Revision Notes</Label>
              <Textarea
                id="revisionNotes"
                rows={6}
                placeholder="Describe the changes you need..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
              />
            </div>
            <div>
              <RevisionTimeSelector onTimeChange={(h) => setRevisionHours(h)} />
              <p className="text-xs text-muted-foreground mt-2">
                For urgent deadlines under 2 hours, please call: <span className="font-semibold">0701066845</span>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestRevisionConfirm} disabled={processing || !revisionNotes.trim()}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval with Rating Dialog - supports approve + rate OR rate-only */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              {ratingOnlyMode ? 'Rate the Writer' : 'Rate the Writer Before Approval'}
            </DialogTitle>
            <DialogDescription>
              {ratingOnlyMode
                ? 'Please rate your experience with the writer.'
                : 'Please rate your experience with the writer. Rating is required to approve the work.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-500">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <strong>Rating is mandatory:</strong> Your rating helps us maintain quality and helps other clients choose the best writers.
              </AlertDescription>
            </Alert>

            <div>
              <Label className="text-base font-semibold">Rating (Required) *</Label>
              <div className="flex gap-2 mt-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star className={`w-10 h-10 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {rating === 5 && '⭐ Excellent!'}
                  {rating === 4 && '👍 Very Good'}
                  {rating === 3 && '👌 Good'}
                  {rating === 2 && '😐 Fair'}
                  {rating === 1 && '👎 Needs Improvement'}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="reviewComment" className="text-base font-semibold">
                Message to Writer (Optional)
              </Label>
              <Textarea
                id="reviewComment"
                rows={4}
                placeholder="Share your experience with the writer..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your feedback helps writers improve their service
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setApprovalDialogOpen(false)}
              disabled={processing}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            {ratingOnlyMode ? (
              <Button onClick={handleSubmitRatingOnly} disabled={processing || rating === 0} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                {processing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>) : (<><CheckCircle className="w-4 h-4 mr-2" />Submit Rating</>)}
              </Button>
            ) : (
              <Button onClick={handleApproveWithRating} disabled={processing || rating === 0} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                {processing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>) : (<><CheckCircle className="w-4 h-4 mr-2" />Submit Rating & Approve</>)}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={showRevisionConfirm}
        onOpenChange={setShowRevisionConfirm}
        title="Request Revision?"
        description="This will send the work back for changes based on your notes."
        confirmText="Yes, Request Revision"
        cancelText="Cancel"
        onConfirm={handleRequestRevision}
      />
    </div>
  );
}