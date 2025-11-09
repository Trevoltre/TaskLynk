"use client";

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { LeftNav } from '@/components/left-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Trash2, Star, Ban, PlayCircle, Shield, ArrowLeft, Award, TrendingUp, Crown, Info, Zap, Building, UserCog, Briefcase, Users, MessageSquare, Link as LinkIcon, FileUp } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type User = {
  id: number;
  email: string;
  name: string;
  role: string;
  approved: boolean;
  balance: number | null;
  rating: number | null;
  phone: string | null;
  status: string;
  suspendedUntil: string | null;
  suspensionReason: string | null;
  blacklistReason: string | null;
  completedJobs: number | null;
  totalSpent: number | null;
  freelancerBadge: string | null;
  clientTier: string | null;
  clientPriority: string | null;
  accountOwner: string | boolean | null;
  createdAt: string;
};

// Badge/Tier display components
const FreelancerBadgeDisplay = ({ badge }: { badge: string | null }) => {
  if (!badge) return <span className="text-muted-foreground text-sm">No Badge</span>;
  
  const badgeConfig = {
    bronze: { label: 'Bronze', icon: Award, color: 'bg-orange-700 text-white', desc: '0-9 orders' },
    silver: { label: 'Silver', icon: Award, color: 'bg-gray-400 text-white', desc: '10-24 orders' },
    gold: { label: 'Gold', icon: Award, color: 'bg-yellow-500 text-white', desc: '25-49 orders' },
    platinum: { label: 'Platinum', icon: Crown, color: 'bg-purple-600 text-white', desc: '50-99 orders' },
    elite: { label: 'Elite', icon: Crown, color: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white', desc: '100+ orders' },
  }[badge];

  if (!badgeConfig) return null;
  const Icon = badgeConfig.icon;

  return (
    <Badge className={badgeConfig.color}>
      <Icon className="w-3 h-3 mr-1" />
      {badgeConfig.label}
    </Badge>
  );
};

const ClientTierDisplay = ({ tier }: { tier: string | null }) => {
  if (!tier) return <span className="text-muted-foreground text-sm">Basic</span>;
  
  const tierConfig = {
    basic: { label: '🪙 Basic', color: 'bg-gray-500 text-white' },
    silver: { label: '🥈 Silver', color: 'bg-gray-400 text-white' },
    gold: { label: '🥇 Gold', color: 'bg-yellow-500 text-white' },
    platinum: { label: '💎 Platinum', color: 'bg-purple-600 text-white' },
  }[tier];

  if (!tierConfig) return null;

  return (
    <Badge className={tierConfig.color}>
      {tierConfig.label}
    </Badge>
  );
};

const ClientPriorityDisplay = ({ priority }: { priority: string | null }) => {
  const priorityConfig = {
    regular: { label: '📋 Regular', color: 'bg-slate-500 text-white' },
    priority: { label: '⚡ Priority', color: 'bg-orange-600 text-white' },
    vip: { label: '👑 VIP', color: 'bg-red-600 text-white' },
  }[priority || 'regular'];

  return (
    <Badge className={priorityConfig.color}>
      {priorityConfig.label}
    </Badge>
  );
};

function AdminUsersContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('pending');
  
  // Add new state for submenu filters
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [accountOwnerFilter, setAccountOwnerFilter] = useState<string | null>(null);
  
  // Selected user and action type state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'remove' | 'suspend' | 'unsuspend' | 'blacklist' | 'badge' | 'tier' | 'priority' | 'message' | 'link' | 'file' | null>(null);
  
  // Suspend dialog state
  const [suspendDuration, setSuspendDuration] = useState('7');
  const [suspendReason, setSuspendReason] = useState('');
  
  // Blacklist dialog state
  const [blacklistReason, setBlacklistReason] = useState('');

  // Badge/Tier dialog state
  const [selectedBadge, setSelectedBadge] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  // Message/Link/File state
  const [messageContent, setMessageContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        fetchUsers();
        
        // Handle filter from URL
        const filterParam = searchParams.get('filter');
        const roleParam = searchParams.get('role');
        const accountOwnerParam = searchParams.get('accountOwner');
        
        if (filterParam && ['all', 'pending', 'approved', 'rejected', 'suspended'].includes(filterParam)) {
          setFilter(filterParam as any);
        }
        
        // Set role and account owner filters from URL
        setRoleFilter(roleParam);
        setAccountOwnerFilter(accountOwnerParam);
      }
    }
  }, [user, loading, router, searchParams]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/users?role=client,freelancer');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });

      if (response.ok) {
        toast.success('User approved successfully');
        fetchUsers();
        setSelectedUser(null);
        setActionType(null);
      } else {
        toast.error('Failed to approve user');
      }
    } catch (error) {
      console.error('Failed to approve user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async (userId: number) => {
    try {
      // Use the dedicated reject endpoint (POST) and include a friendly default reason
      const response = await fetch(`/api/users/${userId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: 'Unfortunately, your application was not approved at this time.'
        }),
      });

      if (response.ok) {
        toast.success('User rejected and notified');
        fetchUsers();
        setSelectedUser(null);
        setActionType(null);
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'Failed to reject user');
      }
    } catch (error) {
      console.error('Failed to reject user:', error);
      toast.error('Failed to reject user');
    }
  };

  const handleRemove = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/remove`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('User removed successfully');
        fetchUsers();
        setSelectedUser(null);
        setActionType(null);
      } else {
        toast.error('Failed to remove user');
      }
    } catch (error) {
      console.error('Failed to remove user:', error);
      toast.error('Failed to remove user');
    }
  };

  const handleSuspend = async () => {
    if (!selectedUser || !suspendReason.trim()) {
      toast.error('Please provide a suspension reason');
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          duration: parseInt(suspendDuration),
          reason: suspendReason 
        }),
      });

      if (response.ok) {
        toast.success('User suspended successfully');
        fetchUsers();
        setSelectedUser(null);
        setActionType(null);
        setSuspendDuration('7');
        setSuspendReason('');
      } else {
        toast.error('Failed to suspend user');
      }
    } catch (error) {
      console.error('Failed to suspend user:', error);
      toast.error('Failed to suspend user');
    }
  };

  const handleUnsuspend = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/unsuspend`, {
        method: 'PATCH',
      });

      if (response.ok) {
        toast.success('User unsuspended successfully');
        fetchUsers();
        setSelectedUser(null);
        setActionType(null);
      } else {
        toast.error('Failed to unsuspend user');
      }
    } catch (error) {
      console.error('Failed to unsuspend user:', error);
      toast.error('Failed to unsuspend user');
    }
  };

  const handleBlacklist = async () => {
    if (!selectedUser || !blacklistReason.trim()) {
      toast.error('Please provide a blacklist reason');
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/blacklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blacklistReason }),
      });

      if (response.ok) {
        toast.success('User blacklisted successfully');
        fetchUsers();
        setSelectedUser(null);
        setActionType(null);
        setBlacklistReason('');
      } else {
        toast.error('Failed to blacklist user');
      }
    } catch (error) {
      console.error('Failed to blacklist user:', error);
      toast.error('Failed to blacklist user');
    }
  };

  const handleBadgeUpdate = async () => {
    if (!selectedUser || !selectedBadge) {
      toast.error('Please select a badge');
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/badge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge: selectedBadge }),
      });

      if (response.ok) {
        toast.success('Badge updated successfully');
        fetchUsers();
        setSelectedUser(null);
        setActionType(null);
        setSelectedBadge('');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update badge');
      }
    } catch (error) {
      console.error('Failed to update badge:', error);
      toast.error('Failed to update badge');
    }
  };

  const handleTierUpdate = async () => {
    if (!selectedUser || !selectedTier) {
      toast.error('Please select a tier');
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/tier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier }),
      });

      if (response.ok) {
        toast.success('Tier updated successfully');
        fetchUsers();
        setSelectedUser(null);
        setActionType(null);
        setSelectedTier('');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update tier');
      }
    } catch (error) {
      console.error('Failed to update tier:', error);
      toast.error('Failed to update tier');
    }
  };

  const handlePriorityUpdate = async () => {
    if (!selectedUser || !selectedPriority) {
      toast.error('Please select a priority');
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: selectedPriority }),
      });

      if (response.ok) {
        toast.success('Priority updated successfully');
        fetchUsers();
        setSelectedUser(null);
        setActionType(null);
        setSelectedPriority('');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update priority');
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleRecalculateRatings = async () => {
    try {
      const response = await fetch('/api/users/calculate-ratings', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Ratings recalculated! Updated ${data.summary.totalUpdated} users (${data.summary.clientsUpdated} clients, ${data.summary.freelancersUpdated} freelancers)`);
        fetchUsers();
      } else {
        toast.error('Failed to recalculate ratings');
      }
    } catch (error) {
      console.error('Failed to recalculate ratings:', error);
      toast.error('Failed to recalculate ratings');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !user) {
      toast.error('Missing user information');
      return;
    }

    if (!messageContent.trim() && actionType !== 'link' && actionType !== 'file') {
      toast.error('Please enter a message');
      return;
    }

    if (actionType === 'link' && !linkUrl.trim()) {
      toast.error('Please enter a link URL');
      return;
    }

    if (actionType === 'file' && !fileUrl.trim()) {
      toast.error('Please provide a file URL');
      return;
    }

    try {
      setSendingMessage(true);

      let content = messageContent.trim();
      let fileUrlToSend = undefined;

      if (actionType === 'link') {
        content = `${content}\n\nLink: ${linkUrl}`.trim();
      } else if (actionType === 'file') {
        content = messageContent.trim() || 'File shared';
        fileUrlToSend = fileUrl;
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: selectedUser.id,
          content,
          fileUrl: fileUrlToSend,
        }),
      });

      if (response.ok) {
        toast.success('Message sent successfully! Awaiting admin approval.');
        setSelectedUser(null);
        setActionType(null);
        setMessageContent('');
        setLinkUrl('');
        setFileUrl('');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    // Apply basic status filter
    let matchesStatus = true;
    if (filter === 'pending') matchesStatus = !u.approved && u.status !== 'blacklisted';
    if (filter === 'approved') matchesStatus = u.approved && u.status === 'active';
    if (filter === 'rejected') matchesStatus = u.status === 'blacklisted';
    if (filter === 'suspended') matchesStatus = u.status === 'suspended';
    
    if (!matchesStatus) return false;
    
    // Apply role filter from submenu
    if (roleFilter && u.role !== roleFilter) return false;
    
    // Apply account owner filter (only for clients)
    if (accountOwnerFilter && u.role === 'client') {
      const isAccountOwner = u.accountOwner === true || u.accountOwner === 'yes';
      if (accountOwnerFilter === 'yes' && !isAccountOwner) return false;
      if (accountOwnerFilter === 'no' && isAccountOwner) return false;
    }
    
    return true;
  });

  const pendingCount = users.filter((u) => !u.approved && u.status !== 'blacklisted').length;
  const approvedCount = users.filter((u) => u.approved && u.status === 'active').length;
  const rejectedCount = users.filter((u) => u.status === 'blacklisted').length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;

  // Calculate summary stats based on current filter
  const getSummaryStats = () => {
    let targetUsers = filteredUsers;
    
    // Calculate totals
    const totalUsers = targetUsers.length;
    const activeUsers = targetUsers.filter(u => u.status === 'active' && u.approved).length;
    const pendingUsers = targetUsers.filter(u => !u.approved && u.status !== 'blacklisted').length;
    const suspendedUsers = targetUsers.filter(u => u.status === 'suspended').length;
    
    // Role-specific stats
    const accountOwners = targetUsers.filter(u => u.role === 'client' && (u.accountOwner === true || u.accountOwner === 'yes')).length;
    const regularClients = targetUsers.filter(u => u.role === 'client' && !(u.accountOwner === true || u.accountOwner === 'yes')).length;
    const freelancers = targetUsers.filter(u => u.role === 'freelancer').length;
    const admins = targetUsers.filter(u => u.role === 'admin').length;
    
    // Average stats
    const avgRating = targetUsers.filter(u => u.rating).reduce((sum, u) => sum + (u.rating || 0), 0) / (targetUsers.filter(u => u.rating).length || 1);
    const totalSpent = targetUsers.filter(u => u.role === 'client').reduce((sum, u) => sum + (u.totalSpent || 0), 0);
    const totalBalance = targetUsers.filter(u => u.role === 'freelancer').reduce((sum, u) => sum + (u.balance || 0), 0);
    const totalCompletedJobs = targetUsers.reduce((sum, u) => sum + (u.completedJobs || 0), 0);
    
    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      accountOwners,
      regularClients,
      freelancers,
      admins,
      avgRating,
      totalSpent,
      totalBalance,
      totalCompletedJobs
    };
  };

  const stats = getSummaryStats();

  // Get page title and description based on current filter
  const getPageInfo = () => {
    if (roleFilter === 'client' && accountOwnerFilter === 'yes') {
      return {
        title: 'Account Owners',
        description: 'Clients who are registered as account owners managing business or organizational accounts',
        icon: Building,
      };
    }
    if (roleFilter === 'client' && accountOwnerFilter === 'no') {
      return {
        title: 'Regular Clients',
        description: 'Individual clients or team members working under account owners',
        icon: UserCog,
      };
    }
    if (roleFilter === 'freelancer') {
      return {
        title: 'Freelancers',
        description: 'Writers, editors, designers, and proofreaders providing services on the platform',
        icon: Briefcase,
      };
    }
    if (roleFilter === 'admin') {
      return {
        title: 'Administrators',
        description: 'Platform administrators with full access to manage users, orders, and platform operations',
        icon: Shield,
      };
    }
    return {
      title: 'All Users',
      description: 'Complete overview of all registered users across the platform',
      icon: Users,
    };
  };

  const pageInfo = getPageInfo();
  const PageIcon = pageInfo.icon;

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
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
      >
        <ArrowLeft className="w-4 h-4 sm:w-6 sm:h-6" />
        <span className="absolute right-full mr-2 sm:mr-3 px-2 sm:px-3 py-1 bg-primary text-primary-foreground text-xs sm:text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Back to Dashboard
        </span>
      </Link>

      <div className="lg:ml-64 container mx-auto px-2 sm:px-4 py-3 sm:py-6 md:py-8">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <PageIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary" />
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold">{pageInfo.title}</h1>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            {pageInfo.description}
          </p>
        </div>

        {/* Summary Stats Card */}
        <Card className="mb-3 sm:mb-4 md:mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              Summary Statistics
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Overview of {pageInfo.title.toLowerCase()} metrics and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary">{stats.totalUsers}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Total Users</div>
              </div>
              <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{stats.activeUsers}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Active</div>
              </div>
              <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">{stats.pendingUsers}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Pending Approval</div>
              </div>
              <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{stats.suspendedUsers}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Suspended</div>
              </div>
              {!roleFilter && (
                <>
                  <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{stats.accountOwners}</div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Account Owners</div>
                  </div>
                  <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">{stats.regularClients}</div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Regular Clients</div>
                  </div>
                  <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">{stats.freelancers}</div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Freelancers</div>
                  </div>
                  <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-600">{stats.admins}</div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Admins</div>
                  </div>
                </>
              )}
              <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-500 flex items-center gap-1">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 fill-yellow-500" />
                  {stats.avgRating.toFixed(1)}
                </div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Average Rating</div>
              </div>
              <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                <div className="text-lg sm:text-xl md:text-2xl font-bold">KSh {stats.totalSpent.toFixed(0)}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Total Spent (Clients)</div>
              </div>
              {(roleFilter === 'freelancer' || !roleFilter) && (
                <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold">KSh {stats.totalBalance.toFixed(2)}</div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Total Balance (Freelancers)</div>
                </div>
              )}
              <div className="bg-background/50 p-2 sm:p-3 md:p-4 rounded-lg border">
                <div className="text-lg sm:text-xl md:text-2xl font-bold">{stats.totalCompletedJobs}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Completed Jobs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-3 sm:mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">User Management Actions</h2>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
              Approve, reject, suspend, or manage user badges, tiers, and priorities
            </p>
          </div>
          <Button onClick={handleRecalculateRatings} variant="outline" size="sm" className="text-xs sm:text-sm w-full sm:w-auto">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Recalculate All Ratings
          </Button>
        </div>

        {/* How-to Guide Card */}
        <Card className="mb-3 sm:mb-4 md:mb-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100 text-sm sm:text-base md:text-lg">
              <Info className="w-4 h-4 sm:w-5 sm:h-5" />
              Quick Guide: Managing User Levels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Freelancer Badge Guide */}
              <div className="space-y-1 sm:space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-blue-900 dark:text-blue-100 text-xs sm:text-sm">
                  <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                  Change Freelancer Badge:
                </h4>
                <ol className="text-[10px] sm:text-xs md:text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Go to <strong>&quot;Approved Users&quot;</strong> tab</li>
                  <li>Find the freelancer in the list</li>
                  <li>Click the <strong>&quot;Badge&quot;</strong> button</li>
                  <li>Select badge level: Bronze, Silver, Gold, or Platinum</li>
                  <li>Click <strong>&quot;Update Badge&quot;</strong></li>
                </ol>
              </div>

              {/* Client Tier Guide */}
              <div className="space-y-1 sm:space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-blue-900 dark:text-blue-100 text-xs sm:text-sm">
                  <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                  Change Client Tier:
                </h4>
                <ol className="text-[10px] sm:text-xs md:text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Go to <strong>&quot;Approved Users&quot;</strong> tab</li>
                  <li>Find the client in the list</li>
                  <li>Click the <strong>&quot;Tier&quot;</strong> button</li>
                  <li>Select tier level: Basic, Regular, Premium, or VIP</li>
                  <li>Click <strong>&quot;Update Tier&quot;</strong></li>
                </ol>
              </div>

              {/* Client Priority Guide */}
              <div className="space-y-1 sm:space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-blue-900 dark:text-blue-100 text-xs sm:text-sm">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                  Change Client Priority:
                </h4>
                <ol className="text-[10px] sm:text-xs md:text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Go to <strong>&quot;Approved Users&quot;</strong> tab</li>
                  <li>Find the client in the list</li>
                  <li>Click the <strong>&quot;Priority&quot;</strong> button</li>
                  <li>Select: Regular or Priority</li>
                  <li>Click <strong>&quot;Update Priority&quot;</strong></li>
                </ol>
              </div>
            </div>
            
            <div className="pt-2 border-t border-blue-200 dark:border-blue-900">
              <p className="text-[9px] sm:text-xs text-muted-foreground italic">
                💡 Tip: Badge/Tier/Priority buttons only appear for approved users with active status. Priority is visible only to admins and never shown to clients.
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="space-y-3 sm:space-y-4">
          <TabsList className="grid grid-cols-5 w-full gap-1 h-auto p-1">
            <TabsTrigger value="pending" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-1.5 sm:py-2 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1">
              <span className="hidden sm:inline">Pending Applications</span>
              <span className="sm:hidden">Pending</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-[8px] sm:text-xs px-1">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-1.5 sm:py-2 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1">
              <span className="hidden sm:inline">Approved Users</span>
              <span className="sm:hidden">Approved</span>
              <Badge variant="secondary" className="text-[8px] sm:text-xs px-1">{approvedCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="suspended" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-1.5 sm:py-2 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1">
              <span className="hidden sm:inline">Suspended</span>
              <span className="sm:hidden">Suspend</span>
              <Badge variant="secondary" className="text-[8px] sm:text-xs px-1">{suspendedCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-1.5 sm:py-2 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1">
              <span className="hidden sm:inline">Rejected/Blacklisted</span>
              <span className="sm:hidden">Rejected</span>
              <Badge variant="secondary" className="text-[8px] sm:text-xs px-1">{rejectedCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="all" className="text-[10px] sm:text-xs md:text-sm px-1 sm:px-2 py-1.5 sm:py-2 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1">
              <span className="hidden sm:inline">All Users</span>
              <span className="sm:hidden">All</span>
              <Badge variant="secondary" className="text-[8px] sm:text-xs px-1">{users.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {['pending', 'approved', 'suspended', 'rejected', 'all'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <CardTitle className="text-sm sm:text-base md:text-lg">
                    {tab === 'pending' && 'Pending Applications'}
                    {tab === 'approved' && 'Approved Users'}
                    {tab === 'suspended' && 'Suspended Users'}
                    {tab === 'rejected' && 'Rejected/Blacklisted Users'}
                    {tab === 'all' && 'All Users'}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {tab === 'pending' && 'Review and approve new user registrations'}
                    {tab === 'approved' && 'Manage approved users on the platform'}
                    {tab === 'suspended' && 'Users temporarily suspended from the platform'}
                    {tab === 'rejected' && 'Users who have been rejected or blacklisted'}
                    {tab === 'all' && 'View all registered users'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  {loadingUsers ? (
                    <div className="text-center py-8 sm:py-12">
                      <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">Name</TableHead>
                            <TableHead className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">Email</TableHead>
                            <TableHead className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">Role</TableHead>
                            <TableHead className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">Badge/Tier</TableHead>
                            <TableHead className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">Priority</TableHead>
                            <TableHead className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">Phone</TableHead>
                            <TableHead className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">Rating</TableHead>
                            <TableHead className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">Stats</TableHead>
                            <TableHead className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">Balance</TableHead>
                            <TableHead className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">Status</TableHead>
                            <TableHead className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium text-[10px] sm:text-xs md:text-sm whitespace-nowrap">{u.name}</TableCell>
                              <TableCell className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">{u.email}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge variant="outline" className="capitalize text-[8px] sm:text-xs">
                                  {u.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {u.role === 'freelancer' ? (
                                  <FreelancerBadgeDisplay badge={u.freelancerBadge} />
                                ) : u.role === 'client' ? (
                                  <ClientTierDisplay tier={u.clientTier} />
                                ) : (
                                  <span className="text-muted-foreground text-[10px] sm:text-xs">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {u.role === 'client' ? (
                                  <ClientPriorityDisplay priority={u.clientPriority} />
                                ) : (
                                  <span className="text-muted-foreground text-[10px] sm:text-xs">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">{u.phone || 'N/A'}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {u.rating ? (
                                  <div className="flex items-center">
                                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500 mr-1" />
                                    <span className="text-[10px] sm:text-xs md:text-sm">{u.rating.toFixed(1)}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] sm:text-xs md:text-sm">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground space-y-1">
                                  <div>Jobs: {u.completedJobs ?? 0}</div>
                                  {u.role === 'client' && <div>Spent: KSh {(u.totalSpent ?? 0).toFixed(0)}</div>}
                                </div>
                              </TableCell>
                              <TableCell className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
                                {u.role === 'freelancer' ? `KSh ${(u.balance ?? 0).toFixed(2)}` : 'N/A'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {u.status === 'active' && u.approved && (
                                  <Badge variant="default" className="text-[8px] sm:text-xs">Active</Badge>
                                )}
                                {u.status === 'suspended' && (
                                  <Badge variant="destructive" className="text-[8px] sm:text-xs">Suspended</Badge>
                                )}
                                {u.status === 'blacklisted' && (
                                  <Badge variant="destructive" className="text-[8px] sm:text-xs">Blacklisted</Badge>
                                )}
                                {!u.approved && u.status !== 'blacklisted' && (
                                  <Badge variant="secondary" className="text-[8px] sm:text-xs">Pending</Badge>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                  {!u.approved && u.status !== 'blacklisted' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() => {
                                          setSelectedUser(u);
                                          setActionType('approve');
                                        }}
                                        className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                      >
                                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">Approve</span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                          setSelectedUser(u);
                                          setActionType('reject');
                                        }}
                                        className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                      >
                                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">Reject</span>
                                      </Button>
                                    </>
                                  )}
                                  {u.approved && u.status === 'active' && (
                                    <>
                                      {u.role === 'freelancer' && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedUser(u);
                                              setSelectedBadge(u.freelancerBadge || 'bronze');
                                              setActionType('badge');
                                            }}
                                            className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                          >
                                            <Award className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                            <span className="hidden sm:inline">Badge</span>
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                              setSelectedUser(u);
                                              setActionType('message');
                                            }}
                                            className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                          >
                                            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                            <span className="hidden sm:inline">Message</span>
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                              setSelectedUser(u);
                                              setActionType('link');
                                            }}
                                            className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                          >
                                            <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                            <span className="hidden sm:inline">Link</span>
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                              setSelectedUser(u);
                                              setActionType('file');
                                            }}
                                            className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                          >
                                            <FileUp className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                            <span className="hidden sm:inline">File</span>
                                          </Button>
                                        </>
                                      )}
                                      {u.role === 'client' && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedUser(u);
                                              setSelectedTier(u.clientTier || 'basic');
                                              setActionType('tier');
                                            }}
                                            className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                          >
                                            <Crown className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                            <span className="hidden sm:inline">Tier</span>
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedUser(u);
                                              setSelectedPriority(u.clientPriority || 'regular');
                                              setActionType('priority');
                                            }}
                                            className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                          >
                                            <Zap className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                            <span className="hidden sm:inline">Priority</span>
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedUser(u);
                                          setActionType('suspend');
                                        }}
                                        className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                      >
                                        <Ban className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">Suspend</span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                          setSelectedUser(u);
                                          setActionType('blacklist');
                                        }}
                                        className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                      >
                                        <Shield className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                        <span className="hidden sm:inline">Blacklist</span>
                                      </Button>
                                    </>
                                  )}
                                  {u.status === 'suspended' && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => {
                                        setSelectedUser(u);
                                        setActionType('unsuspend');
                                      }}
                                      className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                    >
                                      <PlayCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                      <span className="hidden sm:inline">Unsuspend</span>
                                    </Button>
                                  )}
                                  {u.approved && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setSelectedUser(u);
                                        setActionType('remove');
                                      }}
                                      className="text-[10px] sm:text-xs px-2 py-1 h-auto"
                                    >
                                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                      <span className="hidden sm:inline">Remove</span>
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
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <AlertDialog open={!!selectedUser && ['approve', 'reject', 'remove', 'unsuspend'].includes(actionType || '')} onOpenChange={() => {
        setSelectedUser(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' && 'Approve User'}
              {actionType === 'reject' && 'Reject User'}
              {actionType === 'remove' && 'Remove User'}
              {actionType === 'unsuspend' && 'Unsuspend User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' && `Are you sure you want to approve ${selectedUser?.name}? They will gain access to the platform.`}
              {actionType === 'reject' && `Are you sure you want to reject ${selectedUser?.name}? They will be blacklisted and cannot access the platform.`}
              {actionType === 'remove' && `Are you sure you want to remove ${selectedUser?.name}? This action cannot be undone.`}
              {actionType === 'unsuspend' && `Are you sure you want to unsuspend ${selectedUser?.name}? They will regain access to the platform.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  if (actionType === 'approve') handleApprove(selectedUser.id);
                  if (actionType === 'reject') handleReject(selectedUser.id);
                  if (actionType === 'remove') handleRemove(selectedUser.id);
                  if (actionType === 'unsuspend') handleUnsuspend(selectedUser.id);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={actionType === 'suspend'} onOpenChange={(open) => {
        if (!open) {
          setSelectedUser(null);
          setActionType(null);
          setSuspendDuration('7');
          setSuspendReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Temporarily suspend {selectedUser?.name} from the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Suspension Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={suspendDuration}
                onChange={(e) => setSuspendDuration(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Suspension *</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for suspension..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedUser(null);
              setActionType(null);
              setSuspendDuration('7');
              setSuspendReason('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSuspend}>
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionType === 'blacklist'} onOpenChange={(open) => {
        if (!open) {
          setSelectedUser(null);
          setActionType(null);
          setBlacklistReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blacklist User</DialogTitle>
            <DialogDescription>
              Permanently blacklist {selectedUser?.name} from the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blacklistReason">Reason for Blacklist *</Label>
              <Textarea
                id="blacklistReason"
                placeholder="Enter reason for blacklist..."
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedUser(null);
              setActionType(null);
              setBlacklistReason('');
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBlacklist}>
              Blacklist User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionType === 'badge'} onOpenChange={(open) => {
        if (!open) {
          setSelectedUser(null);
          setActionType(null);
          setSelectedBadge('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Freelancer Badge</DialogTitle>
            <DialogDescription>
              Assign or update badge for {selectedUser?.name}. Badges are automatically updated based on completed orders but can be manually adjusted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="badge">Select Badge</Label>
              <Select value={selectedBadge} onValueChange={setSelectedBadge}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a badge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-700 text-white">
                        <Award className="w-3 h-3 mr-1" />
                        Bronze
                      </Badge>
                      <span className="text-muted-foreground">0-9 orders</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="silver">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-400 text-white">
                        <Award className="w-3 h-3 mr-1" />
                        Silver
                      </Badge>
                      <span className="text-muted-foreground">10-24 orders</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gold">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500 text-white">
                        <Award className="w-3 h-3 mr-1" />
                        Gold
                      </Badge>
                      <span className="text-muted-foreground">25-49 orders</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="platinum">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600 text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        Platinum
                      </Badge>
                      <span className="text-muted-foreground">50-99 orders</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="elite">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        Elite
                      </Badge>
                      <span className="text-muted-foreground">100+ orders</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Info className="w-4 h-4" />
                Automatic Badge System
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>🥉 <strong>Bronze:</strong> 0-9 completed orders</li>
                <li>🥈 <strong>Silver:</strong> 10-24 completed orders</li>
                <li>🥇 <strong>Gold:</strong> 25-49 completed orders</li>
                <li>💎 <strong>Platinum:</strong> 50-99 completed orders</li>
                <li>⭐ <strong>Elite:</strong> 100+ completed orders</li>
              </ul>
              <p className="text-xs mt-2 text-muted-foreground italic">
                Note: Badges update automatically when orders are completed. Manual changes will remain until the next order completion.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedUser(null);
              setActionType(null);
              setSelectedBadge('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleBadgeUpdate}>
              Update Badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionType === 'tier'} onOpenChange={(open) => {
        if (!open) {
          setSelectedUser(null);
          setActionType(null);
          setSelectedTier('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Client Tier</DialogTitle>
            <DialogDescription>
              Assign or update tier for {selectedUser?.name}. Tiers are automatically updated based on completed orders but can be manually adjusted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tier">Select Tier</Label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-500 text-white">
                        🪙 Basic
                      </Badge>
                      <span className="text-muted-foreground">0-9 orders</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="silver">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-400 text-white">
                        🥈 Silver
                      </Badge>
                      <span className="text-muted-foreground">10-24 orders</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gold">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500 text-white">
                        🥇 Gold
                      </Badge>
                      <span className="text-muted-foreground">25-49 orders</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="platinum">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600 text-white">
                        💎 Platinum
                      </Badge>
                      <span className="text-muted-foreground">50+ orders</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Info className="w-4 h-4" />
                Automatic Tier System
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>🪙 <strong>Basic:</strong> 0-9 completed orders</li>
                <li>🥈 <strong>Silver:</strong> 10-24 completed orders</li>
                <li>🥇 <strong>Gold:</strong> 25-49 completed orders</li>
                <li>💎 <strong>Platinum:</strong> 50+ completed orders</li>
              </ul>
              <p className="text-xs mt-2 text-muted-foreground italic">
                Note: Tiers update automatically when orders are completed. Manual changes will remain until the next order completion.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedUser(null);
              setActionType(null);
              setSelectedTier('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleTierUpdate}>
              Update Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority Management Dialog */}
      <Dialog open={actionType === 'priority'} onOpenChange={(open) => {
        if (!open) {
          setSelectedUser(null);
          setActionType(null);
          setSelectedPriority('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Client Priority</DialogTitle>
            <DialogDescription>
              Assign or update market priority for {selectedUser?.name}. Priority affects order visibility and matching.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Select Priority</Label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-500 text-white">
                        📋 Regular
                      </Badge>
                      <span className="text-muted-foreground">Standard processing</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="priority">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-600 text-white">
                        ⚡ Priority
                      </Badge>
                      <span className="text-muted-foreground">Enhanced visibility</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="vip">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-600 text-white">
                        👑 VIP
                      </Badge>
                      <span className="text-muted-foreground">Highest priority</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-orange-900 dark:text-orange-100">
                <Zap className="w-4 h-4" />
                Market Priority Levels
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>📋 <strong>Regular:</strong> Standard order processing and freelancer matching</li>
                <li>⚡ <strong>Priority:</strong> Enhanced order visibility, faster writer assignment</li>
                <li>👑 <strong>VIP:</strong> Highest priority, premium writer pool, expedited handling</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-900">
                <p className="text-xs italic text-muted-foreground">
                  🔒 <strong>Admin Only:</strong> Priority status is never shown to clients themselves - it only affects internal order handling.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedUser(null);
              setActionType(null);
              setSelectedPriority('');
            }}>
              Cancel
            </Button>
            <Button onClick={handlePriorityUpdate}>
              Update Priority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={actionType === 'message'} onOpenChange={(open) => {
        if (!open) {
          setSelectedUser(null);
          setActionType(null);
          setMessageContent('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Send a direct message to this freelancer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Enter your message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedUser(null);
              setActionType(null);
              setMessageContent('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage}>
              {sendingMessage ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Link Dialog */}
      <Dialog open={actionType === 'link'} onOpenChange={(open) => {
        if (!open) {
          setSelectedUser(null);
          setActionType(null);
          setMessageContent('');
          setLinkUrl('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Link to {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Share a link with this freelancer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkUrl">Link URL *</Label>
              <Input
                id="linkUrl"
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkMessage">Message (Optional)</Label>
              <Textarea
                id="linkMessage"
                placeholder="Add a message with the link..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedUser(null);
              setActionType(null);
              setMessageContent('');
              setLinkUrl('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage}>
              {sendingMessage ? 'Sending...' : 'Send Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send File Dialog */}
      <Dialog open={actionType === 'file'} onOpenChange={(open) => {
        if (!open) {
          setSelectedUser(null);
          setActionType(null);
          setMessageContent('');
          setFileUrl('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send File to {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Share a file with this freelancer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileUrl">File URL *</Label>
              <Input
                id="fileUrl"
                type="url"
                placeholder="https://example.com/file.pdf"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the direct URL to the file you want to share
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileMessage">Message (Optional)</Label>
              <Textarea
                id="fileMessage"
                placeholder="Add a message with the file..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedUser(null);
              setActionType(null);
              setMessageContent('');
              setFileUrl('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage}>
              {sendingMessage ? 'Sending...' : 'Send File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <AdminUsersContent />
    </Suspense>
  );
}