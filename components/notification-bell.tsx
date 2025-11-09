"use client";

import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  userId: number;
  jobId?: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface MessageCounts {
  clientMessages?: number;
  freelancerMessages?: number;
  unreadMessages?: number;
  totalMessages?: number;
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageCounts, setMessageCounts] = useState<MessageCounts>({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/notifications?userId=${user.id}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        // Only show unread notifications initially
        setNotifications(data.filter((n: Notification) => !n.read));
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/notifications/unread-count?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  // Fetch message counts
  const fetchMessageCounts = async () => {
    if (!user?.id || !user?.role) return;

    try {
      const response = await fetch(`/api/notifications/message-counts?userId=${user.id}&role=${user.role}`);
      if (response.ok) {
        const data = await response.json();
        setMessageCounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch message counts:', error);
    }
  };

  // Mark notification as read and remove from list
  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        // Remove from local state (makes it disappear)
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Handle notification click with navigation
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read first (this removes it from the list)
    markAsRead(notification.id);

    // Navigate to order page if jobId exists
    if (notification.jobId) {
      if (user?.role === 'admin') {
        router.push(`/admin/jobs/${notification.jobId}`);
      } else if (user?.role === 'client') {
        router.push(`/client/jobs/${notification.jobId}`);
      } else if (user?.role === 'freelancer') {
        router.push(`/freelancer/jobs/${notification.jobId}`);
      }
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications/mark-all-read?userId=${user.id}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications([]); // Clear all notifications
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time polling
  useEffect(() => {
    if (!user?.id) return;

    // Initial fetch
    fetchNotifications();
    fetchUnreadCount();
    fetchMessageCounts();

    // Poll every 5 seconds for real-time updates
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
      fetchMessageCounts();
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Get notification icon color based on type
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'account_approved':
        return 'text-green-600 dark:text-green-400';
      case 'account_rejected':
        return 'text-red-600 dark:text-red-400';
      case 'job_assigned':
      case 'order_delivered':
        return 'text-blue-600 dark:text-blue-400';
      case 'payment_received':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'revision_requested':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Render badge counts based on role
  const renderBadge = () => {
    if (unreadCount === 0) return null;

    return (
      <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-semibold">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {renderBadge()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96">
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={isLoading}
              className="h-8"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Show message counts for admin */}
        {user?.role === 'admin' && (messageCounts.clientMessages || messageCounts.freelancerMessages) && (
          <>
            <DropdownMenuSeparator />
            <div className="px-4 py-2 bg-muted/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Pending Messages</p>
              <div className="flex items-center gap-3">
                {messageCounts.clientMessages! > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-semibold">
                      {messageCounts.clientMessages}
                    </span>
                    <span className="text-xs">from Clients</span>
                  </div>
                )}
                {messageCounts.freelancerMessages! > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-semibold">
                      {messageCounts.freelancerMessages}
                    </span>
                    <span className="text-xs">from Freelancers</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Show message counts for client/freelancer */}
        {(user?.role === 'client' || user?.role === 'freelancer') && messageCounts.unreadMessages! > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-4 py-2 bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-semibold">
                  {messageCounts.unreadMessages}
                </span>
                <span className="text-xs font-semibold">Unread Messages</span>
              </div>
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No new notifications</p>
              <p className="text-xs mt-1">All caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex items-start gap-3 p-4 cursor-pointer focus:bg-muted"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {notification.title}
                    </p>
                    <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};