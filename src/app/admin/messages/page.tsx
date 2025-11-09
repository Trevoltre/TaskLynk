"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { LeftNav } from '@/components/left-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  jobId: number | null;
  content: string;
  fileUrl: string | null;
  adminApproved: boolean;
  createdAt: string;
};

export default function AdminMessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        fetchMessages();
      }
    }
  }, [user, loading, router]);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages?adminApproved=false');
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleApprove = async (messageId: number) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });

      if (response.ok) {
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to approve message:', error);
    }
  };

  const handleReject = async (messageId: number) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false }),
      });

      if (response.ok) {
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to reject message:', error);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <LeftNav 
        role="admin" 
        userName={user.name} 
        userRole={user.role} 
      />
      
      {/* Floating Back Button */}
      <Link 
        href="/admin/dashboard"
        className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
      >
        <ArrowLeft className="w-6 h-6" />
        <span className="absolute right-full mr-3 px-3 py-1 bg-primary text-primary-foreground text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Back to Dashboard
        </span>
      </Link>

      <div className="ml-64 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Message Moderation</h1>
          <p className="text-muted-foreground">
            Review and approve messages before they are displayed to users
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Messages</CardTitle>
            <CardDescription>
              Messages awaiting admin approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMessages ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pending messages
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          From User #{message.senderId} to User #{message.receiverId}
                        </p>
                        {message.jobId && (
                          <Badge variant="outline">Job #{message.jobId}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(message.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <p className="mb-4 text-sm">{message.content}</p>
                    {message.fileUrl && (
                      <div className="mb-4">
                        <Badge variant="secondary">Attachment: {message.fileUrl}</Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(message.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(message.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}