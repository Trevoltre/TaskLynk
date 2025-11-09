"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Users, Edit, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type Domain = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  maxUsers: number | null;
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

export default function DomainsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    maxUsers: ''
  });

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        fetchDomains();
      }
    }
  }, [user, loading, router]);

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/domains', {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setDomains(data);
      } else {
        toast.error('Failed to load domains');
      }
    } catch (error) {
      console.error('Failed to fetch domains:', error);
      toast.error('Failed to load domains');
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleCreateDomain = async () => {
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
      };

      if (formData.maxUsers) {
        payload.maxUsers = parseInt(formData.maxUsers);
      }

      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newDomain = await response.json();
        
        // Optimistic update: immediately add to local state
        setDomains([...domains, { ...newDomain, userCount: 0 }]);
        
        toast.success('Domain created successfully');
        setShowCreateDialog(false);
        setFormData({ name: '', description: '', status: 'active', maxUsers: '' });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create domain');
      }
    } catch (error) {
      console.error('Failed to create domain:', error);
      toast.error('Failed to create domain');
    }
  };

  const handleEditDomain = async () => {
    if (!selectedDomain) return;

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
      };

      if (formData.maxUsers) {
        payload.maxUsers = parseInt(formData.maxUsers);
      } else {
        payload.maxUsers = null;
      }

      const response = await fetch(`/api/domains/${selectedDomain.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedDomain = await response.json();
        
        // Optimistic update: immediately update local state
        setDomains(domains.map(d => 
          d.id === selectedDomain.id 
            ? { ...updatedDomain, userCount: d.userCount } 
            : d
        ));
        
        toast.success('Domain updated successfully');
        setShowEditDialog(false);
        setSelectedDomain(null);
        setFormData({ name: '', description: '', status: 'active', maxUsers: '' });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update domain');
      }
    } catch (error) {
      console.error('Failed to update domain:', error);
      toast.error('Failed to update domain');
    }
  };

  const handleDeleteDomain = async (domain: Domain) => {
    if (domain.userCount > 0) {
      toast.error('Cannot delete domain with assigned users');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${domain.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/domains/${domain.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Optimistic update: immediately remove from local state
        setDomains(domains.filter(d => d.id !== domain.id));
        
        toast.success('Domain deleted successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete domain');
      }
    } catch (error) {
      console.error('Failed to delete domain:', error);
      toast.error('Failed to delete domain');
    }
  };

  const openEditDialog = (domain: Domain) => {
    setSelectedDomain(domain);
    setFormData({
      name: domain.name,
      description: domain.description || '',
      status: domain.status,
      maxUsers: domain.maxUsers?.toString() || ''
    });
    setShowEditDialog(true);
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Domain Management</h1>
            <p className="text-muted-foreground">
              Organize users into domains and manage access
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchDomains}
              disabled={loadingDomains}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingDomains ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Domain
            </Button>
          </div>
        </div>

        {loadingDomains ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {domains.map((domain) => (
              <Card key={domain.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{domain.name}</CardTitle>
                      <Badge className={getStatusColor(domain.status)}>
                        {domain.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(domain)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDomain(domain)}
                        disabled={domain.userCount > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {domain.description && (
                    <CardDescription className="mt-2">
                      {domain.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Users:</span>
                      <span className="font-semibold">{domain.userCount}</span>
                    </div>
                    {domain.maxUsers && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Max Users:</span>
                        <span className="font-semibold">{domain.maxUsers}</span>
                      </div>
                    )}
                    <Link href={`/admin/domains/${domain.id}`}>
                      <Button variant="outline" className="w-full mt-4">
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Domain Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Domain</DialogTitle>
              <DialogDescription>
                Create a new domain to organize users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Domain Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Engineering"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Max Users</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                  placeholder="Optional limit"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDomain}>Create Domain</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Domain Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Domain</DialogTitle>
              <DialogDescription>
                Update domain information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Domain Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-maxUsers">Max Users</Label>
                <Input
                  id="edit-maxUsers"
                  type="number"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditDomain}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}