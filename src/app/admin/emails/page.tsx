"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Send, Users, User, CheckCircle2, XCircle, AlertCircle, Eye, Loader2, FileText, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { formatDistanceToNow } from 'date-fns';
import { DashboardNav } from '@/components/dashboard-nav';
import { LeftNav } from '@/components/left-nav';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface User {
  id: number;
  name: string;
  email: string;
  displayId: string;
}

interface EmailLog {
  id: number;
  sentBy: number;
  senderName: string | null;
  senderEmail: string | null;
  sentTo: string;
  recipientType: string;
  recipientCount: number;
  fromEmail: string;
  subject: string;
  status: string;
  jobId: number | null;
  createdAt: string;
}

interface EmailDetail extends EmailLog {
  body: string;
  failedRecipients: { email: string; name: string; error: string }[] | null;
}

interface DailyUsage {
  used: number;
  limit: number;
  remaining: number;
}

const FROM_EMAILS = [
  { value: 'admn@tasklynk.co.ke', label: 'Admin (admn@tasklynk.co.ke)' },
];

const RECIPIENT_TYPES = [
  { value: 'individual', label: 'Individual Users', icon: User },
  { value: 'freelancers', label: 'All Freelancers', icon: Users },
  { value: 'clients', label: 'All Clients', icon: Users },
  { value: 'all_users', label: 'All Users', icon: Users },
];

export default function AdminEmailsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('compose');
  
  // Compose form state
  const [fromEmail, setFromEmail] = useState('admn@tasklynk.co.ke');
  const [recipientType, setRecipientType] = useState('freelancers');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // User selection state
  const [freelancers, setFreelancers] = useState<User[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Email history state
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedEmailDetail, setSelectedEmailDetail] = useState<EmailDetail | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Daily usage state
  const [dailyUsage, setDailyUsage] = useState<DailyUsage | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  // Fetch daily usage on mount
  useEffect(() => {
    const fetchDailyUsage = async () => {
      setIsLoadingUsage(true);
      try {
        const res = await fetch('/api/admin/emails?limit=1');
        if (res.ok) {
          const data = await res.json();
          // Calculate usage from logs
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const todayLogs = Array.isArray(data) ? data.filter((log: EmailLog) => {
            const logDate = new Date(log.createdAt);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
          }) : [];
          
          const used = todayLogs.reduce((sum: number, log: EmailLog) => sum + log.recipientCount, 0);
          setDailyUsage({
            used,
            limit: 100,
            remaining: 100 - used
          });
        }
      } catch (error) {
        console.error('Failed to fetch daily usage:', error);
      } finally {
        setIsLoadingUsage(false);
      }
    };

    fetchDailyUsage();
  }, []);

  // Fetch users for selection
  useEffect(() => {
    const fetchUsers = async () => {
      if (recipientType !== 'individual') return;
      
      setIsLoadingUsers(true);
      try {
        const [freelancersRes, clientsRes] = await Promise.all([
          fetch('/api/users/by-role?role=freelancer'),
          fetch('/api/users/by-role?role=client')
        ]);
        
        if (freelancersRes.ok) {
          const data = await freelancersRes.json();
          setFreelancers(data);
        }
        
        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setClients(data);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [recipientType]);

  // Fetch email history
  const fetchEmailLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/emails?limit=50');
      if (res.ok) {
        const data = await res.json();
        setEmailLogs(data);
      } else {
        toast.error('Failed to fetch email history');
      }
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
      toast.error('Failed to fetch email history');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchEmailLogs();
    }
  }, [activeTab]);

  // View email detail
  const viewEmailDetail = async (emailId: number) => {
    try {
      const res = await fetch(`/api/admin/emails/${emailId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEmailDetail(data);
        setIsViewDialogOpen(true);
      } else {
        toast.error('Failed to load email details');
      }
    } catch (error) {
      console.error('Failed to fetch email detail:', error);
      toast.error('Failed to load email details');
    }
  };

  // Calculate recipient count for limit warning
  const getRecipientCount = () => {
    if (recipientType === 'individual') {
      return selectedUsers.length;
    } else if (recipientType === 'freelancers') {
      return freelancers.length;
    } else if (recipientType === 'clients') {
      return clients.length;
    } else if (recipientType === 'all_users') {
      return freelancers.length + clients.length;
    }
    return 0;
  };

  // Send email
  const handleSendEmail = async () => {
    if (!user?.id) {
      toast.error('You must be logged in as an admin to send emails');
      return;
    }

    if (user.role !== 'admin') {
      toast.error('Only administrators can send bulk emails');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required');
      return;
    }

    if (recipientType === 'individual' && selectedUsers.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    // Check daily limit before sending
    if (dailyUsage) {
      const recipientCount = getRecipientCount();
      if (recipientCount > dailyUsage.remaining) {
        toast.error(`This would exceed your daily quota. You can send ${dailyUsage.remaining} more emails today.`);
        return;
      }
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/admin/emails/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentBy: user.id,
          fromEmail,
          recipientType,
          recipientIds: recipientType === 'individual' ? selectedUsers : undefined,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Email sent successfully to ${data.sent} recipient(s)${data.failed > 0 ? `, ${data.failed} failed` : ''}`);
        
        // Update daily usage
        if (data.dailyUsage) {
          setDailyUsage(data.dailyUsage);
        }
        
        // Reset form
        setSubject('');
        setBody('');
        setSelectedUsers([]);
        
        // Switch to history tab
        setActiveTab('history');
      } else {
        // Handle specific error codes
        if (data.code === 'DAILY_LIMIT_EXCEEDED') {
          toast.error(data.error);
          if (data.data) {
            setDailyUsage({
              used: data.data.used,
              limit: data.data.limit,
              remaining: data.data.remaining
            });
          }
        } else if (data.code === 'USER_NOT_FOUND' || data.code === 'FORBIDDEN_NOT_ADMIN') {
          toast.error('Authentication error. Please log out and log back in.');
        } else {
          toast.error(data.error || 'Failed to send email');
        }
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error('Network error: Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'partial':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRecipientTypeBadge = (type: string) => {
    const config = RECIPIENT_TYPES.find(t => t.value === type);
    const Icon = config?.icon || User;
    
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config?.label || type}
      </Badge>
    );
  };

  // Check if user is admin
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold">Authentication Required</h2>
              <p className="text-muted-foreground">Please log in to access the email management system.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <XCircle className="w-12 h-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-muted-foreground">Only administrators can access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      {user && (
        <LeftNav 
          role="admin" 
          userName={user.name}
          userRole={user.role}
        />
      )}
      <div className="ml-64 transition-all duration-300">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Email Management</h1>
            <p className="text-muted-foreground">
              Compose and send emails to freelancers, clients, or all users for important communications
            </p>
          </div>

          {/* Daily Usage Alert */}
          {isLoadingUsage ? (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Loading daily usage information...</AlertDescription>
            </Alert>
          ) : dailyUsage && (
            <Alert variant={dailyUsage.remaining < 20 ? "destructive" : "default"}>
              <Info className="h-4 w-4" />
              <AlertTitle>Daily Email Usage (Resend Free Tier)</AlertTitle>
              <AlertDescription>
                {dailyUsage.used} of {dailyUsage.limit} emails sent today. {dailyUsage.remaining} remaining.
                {dailyUsage.remaining < 20 && (
                  <span className="block mt-1 font-medium">
                    ⚠️ Running low on daily quota!
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="compose" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Compose Email
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Email History
              </TabsTrigger>
            </TabsList>

            {/* Compose Email Tab */}
            <TabsContent value="compose" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Compose New Email
                  </CardTitle>
                  <CardDescription>
                    Send emails to users for important order updates, announcements, or communications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* From Email */}
                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Select value={fromEmail} onValueChange={setFromEmail}>
                      <SelectTrigger id="fromEmail">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FROM_EMAILS.map((email) => (
                          <SelectItem key={email.value} value={email.value}>
                            {email.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Recipient Type */}
                  <div className="space-y-2">
                    <Label htmlFor="recipientType">Recipients</Label>
                    <Select value={recipientType} onValueChange={(value) => {
                      setRecipientType(value);
                      setSelectedUsers([]);
                    }}>
                      <SelectTrigger id="recipientType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECIPIENT_TYPES.map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Individual User Selection */}
                  {recipientType === 'individual' && (
                    <div className="space-y-2">
                      <Label>Select Recipients</Label>
                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                          {freelancers.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Freelancers</p>
                              {freelancers.map((freelancer) => (
                                <label key={freelancer.id} className="flex items-center gap-2 py-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(freelancer.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedUsers([...selectedUsers, freelancer.id]);
                                      } else {
                                        setSelectedUsers(selectedUsers.filter(id => id !== freelancer.id));
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <span className="text-sm">{freelancer.name} ({freelancer.email})</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {clients.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2 mt-4">Clients</p>
                              {clients.map((client) => (
                                <label key={client.id} className="flex items-center gap-2 py-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(client.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedUsers([...selectedUsers, client.id]);
                                      } else {
                                        setSelectedUsers(selectedUsers.filter(id => id !== client.id));
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <span className="text-sm">{client.name} ({client.email})</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {selectedUsers.length > 0 && (
                        <p className="text-sm text-muted-foreground">{selectedUsers.length} recipient(s) selected</p>
                      )}
                    </div>
                  )}

                  {/* Recipient count warning */}
                  {recipientType !== 'individual' && getRecipientCount() > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        This will send {getRecipientCount()} email(s).
                        {dailyUsage && getRecipientCount() > dailyUsage.remaining && (
                          <span className="block mt-1 text-destructive font-medium">
                            ⚠️ This exceeds your daily remaining quota of {dailyUsage.remaining} emails!
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Email subject line..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <Label htmlFor="body">Email Body (HTML supported)</Label>
                    <Textarea
                      id="body"
                      placeholder="Write your email message here... You can use HTML tags for formatting."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Use HTML tags like &lt;strong&gt;, &lt;p&gt;, &lt;a href=""&gt;, &lt;ul&gt;, &lt;li&gt; for formatting
                    </p>
                  </div>

                  {/* Send Button */}
                  <Button 
                    onClick={handleSendEmail} 
                    disabled={isSending}
                    className="w-full"
                    size="lg"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email History Tab */}
            <TabsContent value="history" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Email History
                  </CardTitle>
                  <CardDescription>
                    View all sent emails and their delivery status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : emailLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No emails sent yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {emailLogs.map((log) => (
                        <div
                          key={log.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => viewEmailDetail(log.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{log.subject}</h3>
                                {getStatusBadge(log.status)}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {getRecipientTypeBadge(log.recipientType)}
                                <span>•</span>
                                <span>{log.recipientCount} recipient(s)</span>
                                <span>•</span>
                                <span>From: {log.fromEmail}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Sent {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                {log.senderName && ` by ${log.senderName}`}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Email Detail Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Email Details</DialogTitle>
                <DialogDescription>
                  Full email content and delivery information
                </DialogDescription>
              </DialogHeader>
              
              {selectedEmailDetail && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">From</Label>
                      <p className="font-medium">{selectedEmailDetail.fromEmail}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedEmailDetail.status)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Recipients</Label>
                      <div className="mt-1">{getRecipientTypeBadge(selectedEmailDetail.recipientType)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Recipient Count</Label>
                      <p className="font-medium">{selectedEmailDetail.recipientCount}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Sent At</Label>
                      <p className="font-medium">{new Date(selectedEmailDetail.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Subject</Label>
                    <p className="font-medium mt-1">{selectedEmailDetail.subject}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Email Body</Label>
                    <div 
                      className="mt-2 p-4 border rounded-md bg-muted/30"
                      dangerouslySetInnerHTML={{ __html: selectedEmailDetail.body }}
                    />
                  </div>

                  {selectedEmailDetail.failedRecipients && selectedEmailDetail.failedRecipients.length > 0 && (
                    <div>
                      <Label className="text-destructive">Failed Recipients</Label>
                      <div className="mt-2 space-y-2">
                        {selectedEmailDetail.failedRecipients.map((recipient, index) => (
                          <div key={index} className="p-3 border border-destructive/50 rounded-md bg-destructive/5">
                            <p className="font-medium text-sm">{recipient.name} ({recipient.email})</p>
                            <p className="text-xs text-muted-foreground">{recipient.error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}