"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  adminApproved: boolean;
  createdAt: string;
  senderName?: string;
  receiverName?: string;
  jobId?: number;
  fileUrl?: string;
};

export default function FreelancerMessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'freelancer') {
        router.push('/');
      } else {
        fetchMessages();
      }
    }
  }, [user, loading, router]);

  const fetchMessages = async () => {
    if (!user?.id) return;
    const controller = new AbortController();
    try {
      setError(null);
      setLoadingMessages(true);
      // API only supports AND conditions; fetch sent and received separately then merge
      const [sentRes, recvRes] = await Promise.all([
        fetch(`/api/messages?senderId=${user.id}&adminApproved=true`, { signal: controller.signal }),
        fetch(`/api/messages?receiverId=${user.id}&adminApproved=true`, { signal: controller.signal }),
      ]);

      const sent = sentRes.ok ? ((await sentRes.json()) as Message[]) : [];
      const recv = recvRes.ok ? ((await recvRes.json()) as Message[]) : [];

      // Merge, dedupe by id, ensure only messages where user is sender or receiver
      const map = new Map<number, Message>();
      [...sent, ...recv]
        .filter((m) => m.adminApproved && (m.senderId === user.id || m.receiverId === user.id))
        .forEach((m) => map.set(m.id, m));

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setMessages(merged);
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') {
        console.error('Failed to fetch messages:', err);
        setError('Failed to load messages. Please try again.');
      }
    } finally {
      setLoadingMessages(false);
    }
    return () => controller.abort();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const approvedMessages = messages.filter((m) => m.adminApproved);

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Back Button */}
      <Link 
        href="/freelancer/dashboard"
        className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
      >
        <ArrowLeft className="w-6 h-6" />
        <span className="absolute right-full mr-3 px-3 py-1 bg-primary text-primary-foreground text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Back to Dashboard
        </span>
      </Link>

      <div className="px-4 md:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with clients and admins
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
            ) : error ? (
              <div className="text-center py-12 text-red-600 text-sm">{error}</div>
            ) : approvedMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedMessages.map((message) => {
                  const isYou = message.senderId === user.id;
                  const senderLabel = isYou ? 'You' : message.senderName || `User #${message.senderId}`;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isYou ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`p-4 rounded-lg max-w-[70%] ${
                          isYou ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium">
                            {senderLabel}
                          </span>
                          <span className="text-xs opacity-70 ml-3">
                            {new Date(message.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        {message.fileUrl && (
                          <div className="mt-2">
                            <a
                              href={message.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline"
                            >
                              View attachment
                            </a>
                          </div>
                        )}
                        {message.jobId && (
                          <div className="mt-2">
                            <Link
                              href={`/freelancer/jobs/${message.jobId}`}
                              className="text-xs underline"
                            >
                              Go to related job
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}