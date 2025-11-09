"use client";

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { LeftNav } from '@/components/left-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  Award,
  Crown,
  Zap,
  Users,
  Star,
  DollarSign,
  FileText,
  Search,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
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
  displayId: string;
  email: string;
  name: string;
  role: string;
  rating: number | null;
  completedJobs: number;
  totalSpent: number;
  totalEarned: number;
  freelancerBadge: string | null;
  clientTier: string | null;
  clientPriority: string | null;
  status: string;
  approved: boolean;
  balance: number;
  createdAt: string;
};

type PerformanceMetrics = {
  completionRate: number;
  avgRating: number;
  totalRevenue: number;
  onTimeDelivery: number;
  customerSatisfaction: number;
  responseTime: number;
};

function AdminPerformanceContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'account_owner' | 'freelancer'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'jobs' | 'revenue'>('rating');
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'promote' | 'demote' | null>(null);
  const [newLevel, setNewLevel] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        fetchUsers();
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchQuery, roleFilter, sortBy]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/users?role=client,freelancer,account_owner');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.displayId.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      } else if (sortBy === 'jobs') {
        return b.completedJobs - a.completedJobs;
      } else if (sortBy === 'revenue') {
        const aRevenue = a.role === 'freelancer' ? a.totalEarned : a.totalSpent;
        const bRevenue = b.role === 'freelancer' ? b.totalEarned : b.totalSpent;
        return bRevenue - aRevenue;
      }
      return 0;
    });

    setFilteredUsers(filtered);
  };

  const handlePromoteDemote = async () => {
    if (!selectedUser || !newLevel) {
      toast.error('Please select a level');
      return;
    }

    try {
      const endpoint = selectedUser.role === 'freelancer' ? 'badge' : 'tier';
      const payload = selectedUser.role === 'freelancer' 
        ? { badge: newLevel }
        : { tier: newLevel };

      const response = await fetch(`/api/users/${selectedUser.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(`User ${actionType === 'promote' ? 'promoted' : 'demoted'} successfully`);
        fetchUsers();
        setSelectedUser(null);
        setActionType(null);
        setNewLevel('');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update user level');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user level');
    }
  };

  const handlePriorityChange = async (userId: number, priority: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });

      if (response.ok) {
        toast.success('Priority updated successfully');
        fetchUsers();
      } else {
        toast.error('Failed to update priority');
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const getPerformanceMetrics = (user: User): PerformanceMetrics => {
    // Calculate performance metrics based on user data
    const completionRate = user.completedJobs > 0 ? 100 : 0; // Simplified
    const avgRating = user.rating || 0;
    const totalRevenue = user.role === 'freelancer' ? user.totalEarned : user.totalSpent;
    const onTimeDelivery = user.completedJobs > 0 ? 85 : 0; // Placeholder
    const customerSatisfaction = (avgRating / 5) * 100;
    const responseTime = 2.5; // Placeholder in hours

    return {
      completionRate,
      avgRating,
      totalRevenue,
      onTimeDelivery,
      customerSatisfaction,
      responseTime,
    };
  };

  const getBadgeInfo = (badge: string | null) => {
    const badges = {
      bronze: { label: 'Bronze', icon: '🥉', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', next: 'silver' },
      silver: { label: 'Silver', icon: '🥈', color: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200', next: 'gold' },
      gold: { label: 'Gold', icon: '🥇', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', next: 'platinum' },
      platinum: { label: 'Platinum', icon: '💎', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', next: null },
    };
    return badges[badge as keyof typeof badges] || badges.bronze;
  };

  const getTierInfo = (tier: string | null) => {
    const tiers = {
      basic: { label: 'Basic', icon: '🪙', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', next: 'regular' },
      regular: { label: 'Regular', icon: '💼', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', next: 'premium' },
      premium: { label: 'Premium', icon: '💎', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', next: 'vip' },
      vip: { label: 'VIP', icon: '👑', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', next: null },
    };
    return tiers[tier as keyof typeof tiers] || tiers.basic;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalUsers = filteredUsers.length;
  const avgRating = filteredUsers.reduce((sum, u) => sum + (u.rating || 0), 0) / totalUsers || 0;
  const totalRevenue = filteredUsers.reduce((sum, u) => 
    sum + (u.role === 'freelancer' ? u.totalEarned : u.totalSpent), 0
  );
  const totalJobs = filteredUsers.reduce((sum, u) => sum + u.completedJobs, 0);

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
          <h1 className="text-3xl font-bold mb-2">User Performance Analysis & Evaluation</h1>
          <p className="text-muted-foreground">
            Evaluate user performance, manage promotions/demotions, and track key metrics
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all roles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-600" />
                Average Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Overall platform rating
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {totalRevenue.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Combined platform revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Total Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalJobs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Completed across platform
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="freelancer">Freelancers</SelectItem>
                  <SelectItem value="client">Clients</SelectItem>
                  <SelectItem value="account_owner">Account Owners</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest Rating</SelectItem>
                  <SelectItem value="jobs">Most Jobs</SelectItem>
                  <SelectItem value="revenue">Highest Revenue</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={fetchUsers} variant="outline">
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Performance Overview</CardTitle>
            <CardDescription>
              Click on a user to view detailed metrics and manage their level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No users found matching your filters
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Current Level</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Jobs</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => {
                      const metrics = getPerformanceMetrics(u);
                      const currentLevel = u.role === 'freelancer' ? u.freelancerBadge : u.clientTier;
                      const levelInfo = u.role === 'freelancer' 
                        ? getBadgeInfo(u.freelancerBadge)
                        : getTierInfo(u.clientTier);

                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-xs text-muted-foreground">{u.displayId}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {u.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={levelInfo.color}>
                              {levelInfo.icon} {levelInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">{(u.rating || 0).toFixed(1)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{u.completedJobs}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              KSh {(u.role === 'freelancer' ? u.totalEarned : u.totalSpent).toFixed(0)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {u.approved && u.status === 'active' ? (
                              <Badge variant="default" className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                {u.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {levelInfo.next && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setNewLevel(levelInfo.next!);
                                    setActionType('promote');
                                  }}
                                >
                                  <TrendingUp className="w-4 h-4 mr-1" />
                                  Promote
                                </Button>
                              )}
                              {currentLevel && currentLevel !== 'bronze' && currentLevel !== 'basic' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    const levels = u.role === 'freelancer'
                                      ? ['bronze', 'silver', 'gold', 'platinum']
                                      : ['basic', 'regular', 'premium', 'vip'];
                                    const currentIndex = levels.indexOf(currentLevel);
                                    setNewLevel(levels[Math.max(0, currentIndex - 1)]);
                                    setActionType('demote');
                                  }}
                                >
                                  <TrendingDown className="w-4 h-4 mr-1" />
                                  Demote
                                </Button>
                              )}
                              {u.role === 'client' || u.role === 'account_owner' && (
                                <Select
                                  value={u.clientPriority || 'regular'}
                                  onValueChange={(v) => handlePriorityChange(u.id, v)}
                                >
                                  <SelectTrigger className="w-32 h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="regular">📋 Regular</SelectItem>
                                    <SelectItem value="priority">⚡ Priority</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Promotion/Demotion Dialog */}
      <Dialog open={!!selectedUser && !!actionType} onOpenChange={() => {
        setSelectedUser(null);
        setActionType(null);
        setNewLevel('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'promote' ? 'Promote User' : 'Demote User'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'promote' 
                ? `Promote ${selectedUser?.name} to the next level based on their performance`
                : `Demote ${selectedUser?.name} due to performance issues`
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Current Performance</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Rating: {(selectedUser.rating || 0).toFixed(1)}/5.0</div>
                  <div>Jobs: {selectedUser.completedJobs}</div>
                  <div>
                    Revenue: KSh {(selectedUser.role === 'freelancer' 
                      ? selectedUser.totalEarned 
                      : selectedUser.totalSpent).toFixed(0)}
                  </div>
                  <div>
                    Current Level: {
                      selectedUser.role === 'freelancer'
                        ? getBadgeInfo(selectedUser.freelancerBadge).label
                        : getTierInfo(selectedUser.clientTier).label
                    }
                  </div>
                </div>
              </div>

              <div className="p-4 border border-primary/20 rounded-lg bg-primary/5">
                <h4 className="font-semibold mb-2">
                  {actionType === 'promote' ? 'New Level' : 'Downgrade To'}
                </h4>
                <p className="text-lg font-bold text-primary">
                  {newLevel && (
                    selectedUser.role === 'freelancer'
                      ? getBadgeInfo(newLevel as any).label
                      : getTierInfo(newLevel as any).label
                  )}
                </p>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {actionType === 'promote'
                    ? 'This will upgrade the user\'s level and may affect their privileges and visibility.'
                    : 'This will downgrade the user\'s level. They will receive a notification about this change.'
                  }
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedUser(null);
              setActionType(null);
              setNewLevel('');
            }}>
              Cancel
            </Button>
            <Button onClick={handlePromoteDemote}>
              {actionType === 'promote' ? (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Confirm Promotion
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Confirm Demotion
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPerformancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <AdminPerformanceContent />
    </Suspense>
  );
}
