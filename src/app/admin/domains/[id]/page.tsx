"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, UserPlus, UserMinus, Users, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type Domain = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  maxUsers: number | null;
  createdAt: string;
  updatedAt: string;
};

type User = {
  id: number;
  email: string;
  name: string;
  role: string;
};

type AllUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  phone: string;
  domainId: number | null;
};

export default function DomainDetailPage() {
  const params = useParams();
  const domainId = params.id as string;
  const { user, loading } = useAuth();
  const router = useRouter();
  const [domain, setDomain] = useState<Domain | null>(null);
  const [domainUsers, setDomainUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        fetchDomainData();
        fetchAllUsers();
      }
    }
  }, [user, loading, router, domainId]);

  const fetchDomainData = async () => {
    try {
      const response = await fetch(`/api/domains/${domainId}`);
      if (response.ok) {
        const data = await response.json();
        setDomain(data.domain);
        setDomainUsers(data.users);
      } else {
        toast.error('Failed to load domain details');
      }
    } catch (error) {
      console.error('Failed to fetch domain:', error);
      toast.error('Failed to load domain details');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleAssignUsers = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    try {
      const response = await fetch(`/api/domains/${domainId}/assign-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUserIds }),
      });

      if (response.ok) {
        toast.success('Users assigned successfully');
        setShowAssignDialog(false);
        setSelectedUserIds([]);
        fetchDomainData();
        fetchAllUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to assign users');
      }
    } catch (error) {
      console.error('Failed to assign users:', error);
      toast.error('Failed to assign users');
    }
  };

  const handleRemoveUser = async (userId: number, userName: string) => {
    if (!confirm(`Remove ${userName} from this domain?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/domains/${domainId}/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('User removed from domain');
        fetchDomainData();
        fetchAllUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Failed to remove user:', error);
      toast.error('Failed to remove user');
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getAvailableUsers = () => {
    return allUsers.filter(u => u.domainId === null || u.domainId !== parseInt(domainId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'inactive':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'suspended':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'client':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'freelancer':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading || !user || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Domain not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin/domains">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Domains
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{domain.name}</h1>
              {domain.description && (
                <p className="text-muted-foreground">{domain.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <Badge className={getStatusColor(domain.status)}>
                  {domain.status}
                </Badge>
                {domain.maxUsers && (
                  <span className="text-sm text-muted-foreground">
                    Max users: {domain.maxUsers}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Domain Users ({domainUsers.length})
                </CardTitle>
                <CardDescription>
                  Manage users assigned to this domain
                </CardDescription>
              </div>
              <Button onClick={() => setShowAssignDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Users
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {domainUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No users assigned to this domain</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowAssignDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign First User
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domainUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUser(user.id, user.name)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Assign Users Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Users to {domain.name}</DialogTitle>
              <DialogDescription>
                Select users to assign to this domain
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {getAvailableUsers().length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No available users to assign
                </p>
              ) : (
                <div className="space-y-2">
                  {getAvailableUsers().map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignDialog(false);
                  setSelectedUserIds([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignUsers}
                disabled={selectedUserIds.length === 0}
              >
                Assign {selectedUserIds.length} User{selectedUserIds.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
