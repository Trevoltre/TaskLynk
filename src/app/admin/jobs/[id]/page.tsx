"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { LeftNav } from '@/components/left-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, UserPlus, Ban, Download, FileText, AlertCircle, ArrowLeft, Send, MessageSquare, ClipboardList, Wallet, FileUp, Loader2, LinkIcon, X, ExternalLink, Info, UserX, Mail } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { CountdownTimer } from '@/components/countdown-timer';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { calculateFreelancerAmount } from '@/lib/payment-calculations';
import { FileUploadSection } from '@/components/file-upload-section';

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
  actualDeadline: string;
  freelancerDeadline: string;
  status: string;
  assignedFreelancerId: number | null;
  adminApproved: boolean;
  clientApproved: boolean;
  revisionRequested: boolean;
  revisionNotes: string | null;
  paymentConfirmed: boolean;
  createdAt: string;
  displayId?: string;
  isRealOrder?: boolean;
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
};

type File = {
  id: number;
  jobId: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedBy: number;
  createdAt: string;
};

type JobMessage = {
  id: number;
  jobId: number;
  senderId: number;
  message: string;
  adminApproved: boolean;
  createdAt: string;
};

type Payment = {
  id: number;
  jobId: number;
  clientId: number;
  freelancerId: number;
  amount: number;
  mpesaCode: string | null;
  status: string;
  confirmedByAdmin: boolean;
  confirmedAt: string | null;
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

type Client = {
  id: number;
  name: string;
  email: string;
};

export default function AdminJobDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [orderSummary, setOrderSummary] = useState<{
    totalOrders: number;
    editingOrders: number;
    completedOrders: number;
    pendingOrders: number;
  } | null>(null);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [directMessageDialogOpen, setDirectMessageDialogOpen] = useState(false);
  const [directMessageRecipient, setDirectMessageRecipient] = useState<'client' | 'freelancer'>('client');
  const [directMessageContent, setDirectMessageContent] = useState('');
  const [sendingDirectMessage, setSendingDirectMessage] = useState(false);
  
  // Link staging states
  const [linkInput, setLinkInput] = useState('');
  const [stagedLinks, setStagedLinks] = useState<string[]>([]);
  const [submittingLinks, setSubmittingLinks] = useState(false);
  
  // Define all fetch functions with useCallback and proper dependencies
  const fetchJobDetails = useCallback(async () => {
    try {
      setLoadingData(true);
      const timestamp = Date.now();
      
      // Fetch job details
      const jobResponse = await fetch(`/api/jobs?_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (jobResponse.ok) {
        const jobsData = await jobResponse.json();
        const foundJob = jobsData.find((j: Job) => j.id === parseInt(jobId));
        if (foundJob) {
          setJob(foundJob);
          
          // Fetch client details after getting job
          if (foundJob.clientId) {
            try {
              const clientResponse = await fetch(`/api/users/${foundJob.clientId}?_=${timestamp}`, {
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                }
              });
              if (clientResponse.ok) {
                const clientData = await clientResponse.json();
                setClient(clientData);
              }
            } catch (error) {
              console.error('Failed to fetch client details:', error);
            }
          }
        } else {
          router.push('/admin/jobs');
          return;
        }
      }

      // Fetch bids for this job
      const bidsResponse = await fetch(`/api/bids?jobId=${jobId}&_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (bidsResponse.ok) {
        const bidsData = await bidsResponse.json();
        setBids(bidsData);
      }

      // Fetch files for this job
      const filesResponse = await fetch(`/api/files?jobId=${jobId}&_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        setFiles(filesData);
      }

      // Fetch messages for this job (admin sees all messages)
      const messagesResponse = await fetch(`/api/jobs/${jobId}/messages?userRole=admin&_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData);
      }

      // Fetch payment for this job
      const paymentsResponse = await fetch(`/api/payments?jobId=${jobId}&_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        if (paymentsData.length > 0) {
          setPayment(paymentsData[0]);
        }
      }

      // Fetch attachments for this job
      const attachmentsResponse = await fetch(`/api/jobs/${jobId}/attachments?_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (attachmentsResponse.ok) {
        const attachmentsData = await attachmentsResponse.json();
        setAttachments(attachmentsData);
      }
    } catch (error) {
      console.error('Failed to fetch job details:', error);
    } finally {
      setLoadingData(false);
    }
  }, [jobId, router]);

  const fetchOrderSummary = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/jobs?_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const allJobs = await response.json();
        setOrderSummary({
          totalOrders: allJobs.length,
          editingOrders: allJobs.filter((j: Job) => j.status === 'editing').length,
          completedOrders: allJobs.filter((j: Job) => j.status === 'completed').length,
          pendingOrders: allJobs.filter((j: Job) => j.status === 'pending' && !j.adminApproved).length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch order summary:', error);
    }
  }, []);

  const fetchFreelancers = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/users?role=freelancer&approved=true&_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFreelancers(data);
      }
    } catch (error) {
      console.error('Failed to fetch freelancers:', error);
    }
  }, []);

  // Main effect - properly ordered with all dependencies
  useEffect(() => {
    if (!loading && user && user.role === 'admin') {
      fetchJobDetails();
      fetchFreelancers();
      fetchOrderSummary();
    } else if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router, fetchJobDetails, fetchFreelancers, fetchOrderSummary]);

  const handleSubmitRevision = async () => {
    if (!job || !revisionFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setProcessing(true);
    try {
      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append('file', revisionFile);
      formData.append('jobId', job.id.toString());
      formData.append('folder', 'tasklynk/uploads');
      
      // Upload to Cloudinary first
      const cloudinaryResponse = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      });

      if (!cloudinaryResponse.ok) {
        const errorData = await cloudinaryResponse.json();
        toast.error(errorData.error || 'Failed to upload file');
        setProcessing(false);
        return;
      }

      const cloudinaryData = await cloudinaryResponse.json();

      // Save to database as attachment
      const response = await fetch(`/api/jobs/${job.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: revisionFile.name,
          fileUrl: cloudinaryData.url,
          fileSize: revisionFile.size,
          fileType: revisionFile.type,
          uploadType: 'revision',
          uploadedBy: user?.id || 0,
        }),
      });

      if (response.ok) {
        setRevisionDialogOpen(false);
        setRevisionFile(null);
        setRevisionNotes('');
        toast.success('Revision submitted successfully!');
        fetchJobDetails();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save revision metadata');
      }
    } catch (error) {
      console.error('Failed to submit revision:', error);
      toast.error('Failed to submit revision');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!job) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/jobs/${job.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });

      if (response.ok) {
        fetchJobDetails();
      }
    } catch (error) {
      console.error('Failed to approve job:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!job) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/jobs/${job.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false }),
      });

      if (response.ok) {
        fetchJobDetails();
      }
    } catch (error) {
      console.error('Failed to reject job:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleAssign = async () => {
    if (!job || !selectedFreelancer) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/jobs/${job.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freelancerId: parseInt(selectedFreelancer) }),
      });

      if (response.ok) {
        setAssignDialogOpen(false);
        setSelectedFreelancer('');
        fetchJobDetails();
      }
    } catch (error) {
      console.error('Failed to assign job:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleUnassign = async () => {
    if (!job) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/jobs/${job.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freelancerId: null }),
      });

      if (response.ok) {
        toast.success('Freelancer unassigned successfully!');
        fetchJobDetails();
      } else {
        toast.error('Failed to unassign freelancer');
      }
    } catch (error) {
      console.error('Failed to unassign job:', error);
      toast.error('Failed to unassign freelancer');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!job) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        fetchJobDetails();
      }
    } catch (error) {
      console.error('Failed to cancel job:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeliverToClient = async () => {
    if (!job) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' }),
      });

      if (response.ok) {
        toast.success('Work delivered to client! They will be notified.');
        fetchJobDetails();
      }
    } catch (error) {
      console.error('Failed to deliver work:', error);
      toast.error('Failed to deliver work');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveRevision = async () => {
    if (!job) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'revision',
          revisionRequested: true,
        }),
      });

      if (response.ok) {
        toast.success('Revision request approved! Freelancer has been notified.');
        fetchJobDetails();
      }
    } catch (error) {
      console.error('Failed to approve revision:', error);
      toast.error('Failed to approve revision');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectRevision = async () => {
    if (!job) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'delivered',
          revisionRequested: false,
          revisionNotes: null,
        }),
      });

      if (response.ok) {
        toast.success('Revision request rejected. Order remains as delivered.');
        fetchJobDetails();
      }
    } catch (error) {
      console.error('Failed to reject revision:', error);
      toast.error('Failed to reject revision');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprovePayment = async () => {
    if (!payment || !job) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/payments/${payment.id}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Payment approved! Freelancer balance updated and invoices created.');
        fetchJobDetails();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to approve payment');
      }
    } catch (error) {
      console.error('Failed to approve payment:', error);
      toast.error('Failed to approve payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadFile = (file: File) => {
    window.open(file.fileUrl, '_blank');
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    // Admin can download all files freely
    toast.info(`Downloading ${attachment.fileName}...`);
    window.open(attachment.fileUrl, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDeliverMessage = async (messageId: number) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/messages/${messageId}/deliver`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Message delivered successfully!');
        fetchJobDetails();
      } else {
        toast.error('Failed to deliver message');
      }
    } catch (error) {
      console.error('Failed to deliver message:', error);
      toast.error('Failed to deliver message');
    } finally {
      setProcessing(false);
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
        toast.success('Message sent! Waiting for admin approval before delivery.');
        fetchJobDetails();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setProcessing(false);
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
      toast.error('Please enter a valid URL');
      return;
    }

    setStagedLinks(prev => [...prev, linkInput.trim()]);
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

      toast.success(`${stagedLinks.length} link(s) submitted and auto-approved!`);
      setStagedLinks([]);
      setLinkInput('');
      fetchJobDetails();
    } catch (error) {
      console.error('Failed to submit links:', error);
      toast.error('Failed to submit links');
    } finally {
      setSubmittingLinks(false);
    }
  };

  const handleApproveLink = async (linkId: number) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/messages/${linkId}/deliver`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Link approved and delivered!');
        fetchJobDetails();
      } else {
        toast.error('Failed to approve link');
      }
    } catch (error) {
      console.error('Failed to approve link:', error);
      toast.error('Failed to approve link');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendDirectMessage = async () => {
    if (!directMessageContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!job) return;

    const recipientId = directMessageRecipient === 'client' ? job.clientId : job.assignedFreelancerId;
    
    if (!recipientId) {
      toast.error(`No ${directMessageRecipient} assigned to this job`);
      return;
    }

    setSendingDirectMessage(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user?.id,
          message: directMessageContent,
          recipientId: recipientId,
          autoApprove: true, // Admin messages are auto-approved
        }),
      });

      if (response.ok) {
        toast.success(`Message sent to ${directMessageRecipient} successfully!`);
        setDirectMessageContent('');
        setDirectMessageDialogOpen(false);
        fetchJobDetails();
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send direct message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingDirectMessage(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const assignedFreelancer = freelancers.find(f => f.id === job.assignedFreelancerId);
  const freelancerAmount = calculateFreelancerAmount(job.amount);
  const pendingMessages = messages.filter(m => !m.adminApproved);
  const deliveredMessages = messages.filter(m => m.adminApproved);

  // NEW: Derive writer uploads (freelancer-only) and admin final uploads
  const writerUploads = attachments.filter(att => att.uploadType !== 'initial' && (att as any).uploaderRole === 'freelancer');
  const adminFinalUploads = attachments.filter(att => att.uploadType === 'final');
  const clientUploads = attachments.filter(att => att.uploadType === 'initial' || (att as any).uploaderRole === 'client');

  return (
    <>
      <DashboardNav />
      <LeftNav 
        role="admin" 
        userName={user?.name || ''} 
        userRole={user?.role || 'admin'}
      />
      <div className="min-h-screen bg-background ml-64 transition-all duration-300 pb-20">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Breadcrumb Navigation */}
          <div className="mb-4">
            <Link 
              href="/admin/jobs"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Jobs
            </Link>
          </div>

          {/* Order Summary Card */}
          {orderSummary && (
            <Card className="mb-4 bg-gradient-to-r from-primary/5 to-secondary/5 border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="w-4 h-4" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2.5 bg-background rounded-lg border">
                    <p className="text-xl font-bold text-primary">{orderSummary.totalOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Orders</p>
                  </div>
                  <div className="text-center p-2.5 bg-background rounded-lg border">
                    <p className="text-xl font-bold text-blue-600">{orderSummary.editingOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Under Review</p>
                  </div>
                  <div className="text-center p-2.5 bg-background rounded-lg border">
                    <p className="text-xl font-bold text-green-600">{orderSummary.pendingOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Pending Approval</p>
                  </div>
                  <div className="text-center p-2.5 bg-background rounded-lg border">
                    <p className="text-xl font-bold text-green-600">{orderSummary.completedOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Header with Status Badge */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">{job.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Posted on {format(new Date(job.createdAt), 'MMM dd, yyyy')}</span>
                  {job.displayId && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {job.displayId}
                    </Badge>
                  )}
                  {client && (
                    <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                      Client: {client.name}
                    </Badge>
                  )}
                </div>
              </div>
              <Badge
                variant="secondary"
                className="capitalize px-3 py-1.5 bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100 border border-purple-300 dark:border-purple-700"
              >
                {job.status === 'editing' ? 'Under Review' : 
                 job.status === 'revision_pending' ? 'Revision Pending' :
                 job.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Dual Countdown Timers */}
          {(job.actualDeadline || job.freelancerDeadline) && (
            <div className="mb-4 grid md:grid-cols-2 gap-3">
              {job.actualDeadline && (
                <Card className="border">
                  <CardContent className="pt-3 pb-3">
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Client's Deadline</Label>
                        <p className="font-medium text-sm">{format(new Date(job.actualDeadline), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                      <CountdownTimer 
                        deadline={job.actualDeadline} 
                        colorScheme="purple" 
                        label="Client" 
                        status={job.status}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              {job.freelancerDeadline && (
                <Card className="border">
                  <CardContent className="pt-3 pb-3">
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Freelancer's Deadline</Label>
                        <p className="font-medium text-sm">{format(new Date(job.freelancerDeadline), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                      <CountdownTimer 
                        deadline={job.freelancerDeadline} 
                        colorScheme="green" 
                        label="Writer" 
                        status={job.status}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Action Alerts */}
          {job.status === 'pending' && !job.adminApproved && (
            <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Action Required:</strong> This job is awaiting your approval. Review all details before approving.
              </AlertDescription>
            </Alert>
          )}

          {job.status === 'editing' && (
            <Alert className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-900/10">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Action Required:</strong> Review the freelancer's submitted work and deliver it to the client when ready.
              </AlertDescription>
            </Alert>
          )}

          {job.status === 'revision_pending' && (
            <Alert className="mb-4 border-purple-500 bg-purple-50 dark:bg-purple-900/10">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-sm text-purple-800 dark:text-purple-200">
                <strong>Action Required:</strong> Client has requested a revision. Approve or reject this request.
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Approval Alert - NEW */}
          {job.status === 'delivered' && payment && !payment.confirmedByAdmin && payment.status === 'pending' && (
            <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/10">
              <Wallet className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                <strong>Payment Pending:</strong> Client has submitted payment. Review and approve to complete the order and credit freelancer's balance.
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Information Card - NEW */}
          {payment && job.status === 'delivered' && (
            <Card className="mb-4 border-2 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Payment Information
                </CardTitle>
                <CardDescription className="text-sm">
                  Review payment details before approval
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment Amount</Label>
                    <p className="font-semibold text-base text-green-600">KSh {payment.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">M-Pesa Code</Label>
                    <p className="font-medium text-sm font-mono">{payment.mpesaCode || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment Status</Label>
                    <Badge variant={payment.confirmedByAdmin ? 'default' : 'secondary'} className="capitalize">
                      {payment.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Submitted At</Label>
                    <p className="font-medium text-sm">{format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  {payment.confirmedAt && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Confirmed At</Label>
                      <p className="font-medium text-sm">{format(new Date(payment.confirmedAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">Freelancer Payout</Label>
                    <p className="font-semibold text-base text-blue-600">KSh {freelancerAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">70% of client amount</p>
                  </div>
                </div>

                {!payment.confirmedByAdmin && payment.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleApprovePayment} disabled={processing} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Approve Payment & Complete Order
                    </Button>
                    <Button variant="outline" disabled={processing}>
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Reject Payment
                    </Button>
                  </div>
                )}

                {payment.confirmedByAdmin && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm text-green-900 dark:text-green-100">Payment Confirmed</p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Freelancer has been credited KSh {freelancerAmount.toFixed(2)} • Invoice generated
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Job Details Card */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Details</CardTitle>
              <CardDescription className="text-sm">
                Review the complete job information and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Work Type</Label>
                  <p className="font-medium text-sm capitalize">{job.workType}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Client Amount</Label>
                  <p className="font-semibold text-base text-green-600">KSh {job.amount.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Freelancer Amount</Label>
                  <p className="font-semibold text-base text-blue-600">KSh {freelancerAmount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">70% of client amount</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Pages</Label>
                  <p className="font-medium text-sm">{job.pages || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Slides</Label>
                  <p className="font-medium text-sm">{job.slides || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Admin Approved</Label>
                  <p className="font-medium text-sm">{job.adminApproved ? '✅ Yes' : '❌ No'}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground font-semibold">Instructions</Label>
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{job.instructions}</p>
                </div>
              </div>

              {assignedFreelancer && (
                <div>
                  <Label className="text-xs text-muted-foreground">Assigned Freelancer</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                      {assignedFreelancer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{assignedFreelancer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignedFreelancer.rating ? `★ ${assignedFreelancer.rating.toFixed(1)} rating` : 'No rating yet'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {job.status === 'revision_pending' && job.revisionNotes && (
                <div>
                  <Label className="text-sm text-muted-foreground font-semibold">Revision Request from Client</Label>
                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm whitespace-pre-wrap">{job.revisionNotes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bids Card */}
          {bids.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Freelancer Bids ({bids.length})</CardTitle>
                <CardDescription className="text-sm">
                  Bids placed by freelancers for this job
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bids.map((bid) => {
                    const freelancer = freelancers.find(f => f.id === bid.freelancerId);
                    return (
                      <div
                        key={bid.id}
                        className="p-2.5 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                              {freelancer?.name.charAt(0).toUpperCase() || 'F'}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{freelancer?.name || `Freelancer #${bid.freelancerId}`}</p>
                              <p className="text-xs text-muted-foreground">
                                {freelancer?.rating ? `★ ${freelancer.rating.toFixed(1)} rating` : 'No rating'} • {format(new Date(bid.createdAt), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <p className="font-semibold text-base text-green-600">KSh {bid.bidAmount.toFixed(2)}</p>
                            <Badge variant="outline" className="capitalize text-xs">
                              {bid.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground ml-10">{bid.message}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages Card */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Messages
                </span>
                {pendingMessages.length > 0 && (
                  <Badge variant="destructive" className="text-xs">{pendingMessages.length} Pending</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                Review and deliver messages between client and freelancer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Message input for admin */}
              <div className="flex gap-2 pb-3 border-b">
                <Input
                  placeholder="Send a message as admin..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleSendMessage} disabled={processing || !newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Pending Messages */}
              {pendingMessages.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Pending Delivery</h3>
                  {pendingMessages.map((msg) => (
                    <div key={msg.id} className="border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-2.5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-1.5 text-xs">
                            From: {msg.senderId === job.clientId ? 'Client' : 'Freelancer'}
                          </Badge>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                          {format(new Date(msg.createdAt), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleDeliverMessage(msg.id)}
                        disabled={processing}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Deliver to {msg.senderId === job.clientId ? 'Freelancer' : 'Client'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Delivered Messages */}
              {deliveredMessages.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Delivered Messages</h3>
                  {deliveredMessages.map((msg) => (
                    <div key={msg.id} className="border rounded-lg p-2.5 bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <Badge variant="secondary" className="mb-1.5 text-xs">
                            From: {msg.senderId === job.clientId ? 'Client' : 'Freelancer'}
                          </Badge>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-3">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(msg.createdAt), 'MMM dd, HH:mm')}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Delivered
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No messages yet</p>
              )}
            </CardContent>
          </Card>

          {/* Direct Messaging Card - NEW */}
          <Card className="mb-4 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-100 text-base">
                <Mail className="w-5 h-5" />
                Direct Messaging
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300 text-sm">
                Send messages directly to the client or freelancer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => {
                    setDirectMessageRecipient('client');
                    setDirectMessageDialogOpen(true);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={!client}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Message Client
                  {client && <span className="ml-2 text-xs">({client.name})</span>}
                </Button>
                <Button
                  onClick={() => {
                    setDirectMessageRecipient('freelancer');
                    setDirectMessageDialogOpen(true);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={!assignedFreelancer}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Message Freelancer
                  {assignedFreelancer && <span className="ml-2 text-xs">({assignedFreelancer.name})</span>}
                </Button>
              </div>
              {!assignedFreelancer && (
                <Alert className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-sm">
                    No freelancer assigned yet. Assign a freelancer to enable direct messaging to them.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Client vs Writer Uploads - side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Client Uploads (left) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Client Uploads</CardTitle>
                <CardDescription className="text-sm">Files uploaded by the client when creating the order</CardDescription>
              </CardHeader>
              <CardContent>
                {clientUploads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No client uploads</p>
                ) : (
                  <div className="space-y-2">
                    {clientUploads.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="min-w-0 mr-3">
                          <p className="text-sm font-medium truncate">{att.fileName}</p>
                          <p className="text-xs text-muted-foreground">{att.uploadType || 'initial'} • {format(new Date(att.createdAt), 'MMM dd, HH:mm')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">Client</Badge>
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadAttachment(att)}>
                            <Download className="w-3 h-3 mr-1" /> Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Writer Uploads (right, admin-only view) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Writer Uploads</CardTitle>
                <CardDescription className="text-sm">Files uploaded by the assigned freelancer</CardDescription>
              </CardHeader>
              <CardContent>
                {writerUploads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No writer uploads yet</p>
                ) : (
                  <div className="space-y-2">
                    {writerUploads.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="min-w-0 mr-3">
                          <p className="text-sm font-medium truncate">{att.fileName}</p>
                          <p className="text-xs text-muted-foreground">Type: {att.uploadType} • {format(new Date(att.createdAt), 'MMM dd, HH:mm')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">Writer</Badge>
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadAttachment(att)}>
                            <Download className="w-3 h-3 mr-1" /> Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Admin Final Deliveries */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Admin Final Files</CardTitle>
              <CardDescription className="text-sm">Files delivered by admin to the client</CardDescription>
            </CardHeader>
            <CardContent>
              {adminFinalUploads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No final files uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {adminFinalUploads.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="min-w-0 mr-3">
                        <p className="text-sm font-medium truncate">{att.fileName}</p>
                        <p className="text-xs text-muted-foreground">Final • {format(new Date(att.createdAt), 'MMM dd, HH:mm')}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDownloadAttachment(att)}>
                        <Download className="w-3 h-3 mr-1" /> Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mb-4">
            <FileUploadSection
              jobId={parseInt(jobId)}
              currentUserId={user?.id || 0}
              currentUserRole="admin"
              files={attachments.map((att) => ({
                id: att.id,
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileSize: att.fileSize,
                fileType: att.fileType,
                uploadType: att.uploadType,
                uploadedBy: att.uploadedBy,
                createdAt: att.createdAt,
              }))}
              canUpload={true}
              canDownload={true}
              uploadType="final"
              onFileUploaded={fetchJobDetails}
              currentJobType={job.workType}
              clientId={job.clientId}
            />
          </div>

          {/* Actions Card */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Admin Actions</CardTitle>
              <CardDescription className="text-sm">
                Manage this job's status and workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.status === 'pending' && !job.adminApproved && (
                  <>
                    <Button onClick={handleApprove} disabled={processing} size="sm">
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Approve Job
                    </Button>
                    <Button variant="destructive" onClick={handleReject} disabled={processing} size="sm">
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Reject Job
                    </Button>
                  </>
                )}
                
                {(job.status === 'approved' || (job.status === 'assigned' && !job.assignedFreelancerId)) && (
                  <Button onClick={() => setAssignDialogOpen(true)} disabled={processing} size="sm">
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    {job.assignedFreelancerId ? 'Reassign Freelancer' : 'Assign Freelancer'}
                  </Button>
                )}

                {/* Unassign Button - Show when freelancer is assigned */}
                {job.assignedFreelancerId && job.status !== 'completed' && job.status !== 'cancelled' && (
                  <Button 
                    variant="outline" 
                    onClick={handleUnassign} 
                    disabled={processing} 
                    size="sm"
                    className="border-orange-500 text-orange-700 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400"
                  >
                    <UserX className="w-4 h-4 mr-1.5" />
                    Unassign Freelancer
                  </Button>
                )}

                {job.status === 'editing' && (
                  <Button onClick={handleDeliverToClient} disabled={processing} size="sm">
                    <Send className="w-4 h-4 mr-1.5" />
                    Deliver to Client
                  </Button>
                )}

                {job.status === 'revision_pending' && (
                  <>
                    <Button onClick={handleApproveRevision} disabled={processing} size="sm">
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Approve Revision Request
                    </Button>
                    <Button variant="outline" onClick={handleRejectRevision} disabled={processing} size="sm">
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Reject Revision Request
                    </Button>
                  </>
                )}

                {/* Submit Revision Button - Available for any status */}
                <Button 
                  variant="outline"
                  onClick={() => setRevisionDialogOpen(true)} 
                  disabled={processing}
                  size="sm"
                >
                  <FileUp className="w-4 h-4 mr-1.5" />
                  Submit Revision
                </Button>

                {job.status !== 'completed' && job.status !== 'cancelled' && (
                  <Button variant="destructive" onClick={handleCancel} disabled={processing} size="sm">
                    <Ban className="w-4 h-4 mr-1.5" />
                    Cancel Job
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Back Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/admin/dashboard">
              <Button
                size="icon"
                className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Back to Dashboard</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Assign Freelancer Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Freelancer</DialogTitle>
            <DialogDescription>
              Select a freelancer to assign to this job
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <p className="font-medium text-sm">{job.title}</p>
              <p className="text-sm text-muted-foreground">
                Amount: KSh {job.amount.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                {bids.length} freelancers placed bids
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="freelancer">Select Freelancer</Label>
              <Select value={selectedFreelancer} onValueChange={setSelectedFreelancer}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a freelancer" />
                </SelectTrigger>
                <SelectContent>
                  {freelancers.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.name} {f.rating ? `(★ ${f.rating.toFixed(1)})` : '(No rating)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedFreelancer || processing}>
              Assign Freelancer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Revision Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Revision</DialogTitle>
            <DialogDescription>
              Upload a revision file for this order that will be sent to the freelancer after approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> This revision will be saved and can be sent directly to the freelancer from the Revisions management page.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="revisionFile">Upload File *</Label>
              <Input
                id="revisionFile"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Check file size (40MB limit)
                    if (file.size > 40 * 1024 * 1024) {
                      toast.error('File size must be less than 40MB');
                      e.target.value = '';
                      return;
                    }
                    setRevisionFile(file);
                  }
                }}
                accept="*/*"
                className="mt-2"
              />
              {revisionFile && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {revisionFile.name} ({(revisionFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="revisionNotes">Notes (Optional)</Label>
              <Textarea
                id="revisionNotes"
                placeholder="Add any notes about this revision for the freelancer..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRevision} disabled={processing || !revisionFile}>
              <FileUp className="w-4 h-4 mr-2" />
              Submit Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Direct Message Dialog - NEW */}
      <Dialog open={directMessageDialogOpen} onOpenChange={setDirectMessageDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Direct Message
            </DialogTitle>
            <DialogDescription>
              Send a message directly to the {directMessageRecipient}. This message will be automatically approved and delivered.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={directMessageRecipient === 'client' ? 'default' : 'secondary'}>
                  {directMessageRecipient === 'client' ? 'To: Client' : 'To: Freelancer'}
                </Badge>
                <span className="text-sm font-medium">
                  {directMessageRecipient === 'client' ? client?.name : assignedFreelancer?.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {directMessageRecipient === 'client' ? client?.email : assignedFreelancer?.email}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="directMessage">Message</Label>
              <Textarea
                id="directMessage"
                placeholder={`Type your message to the ${directMessageRecipient} here...`}
                value={directMessageContent}
                onChange={(e) => setDirectMessageContent(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This message will be delivered immediately without requiring approval.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDirectMessageDialogOpen(false);
                setDirectMessageContent('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendDirectMessage} 
              disabled={sendingDirectMessage || !directMessageContent.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendingDirectMessage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}