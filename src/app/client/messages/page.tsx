"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  adminApproved: boolean;
  createdAt: string;
  senderName?: string;
  receiverName?: string;
};

export default function ClientMessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'client') {
        router.push('/');
      } else {
        fetchMessages();
      }
    }
  }, [user, loading, router]);

  const fetchMessages = async () => {
    try {
      setLoadingMessages(true);
      const response = await fetch('/api/messages');
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

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const approvedMessages = messages.filter(m => m.adminApproved);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with freelancers and admins
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Messages</CardTitle>
            <CardDescription>
              All messages are moderated by admin before delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMessages ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : approvedMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === user.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`p-4 rounded-lg max-w-[70%] ${
                        message.senderId === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium">
                          {message.senderId === user.id ? 'You' : message.senderName}
                        </span>
                        <span className="text-xs opacity-70 ml-3">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
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