"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Phone, 
  Star, 
  DollarSign, 
  FileText, 
  CheckCircle,
  TrendingUp,
  Calendar,
  Camera,
  Upload,
  Save
} from 'lucide-react';

type UserSummary = {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    phone: string;
    approved: boolean;
    status: string;
    balance: number;
    rating: number | null;
    totalEarned: number;
    totalSpent: number;
    completedJobs: number;
    completionRate: number | null;
    createdAt: string;
  };
  stats: {
    totalJobsPosted?: number;
    totalJobsCompleted?: number;
    totalJobsCancelled?: number;
    totalAmountEarned?: number;
    totalAmountSpent?: number;
    averageRating?: number;
    totalRatings?: number;
    onTimeDelivery?: number;
    lateDelivery?: number;
    revisionsRequested?: number;
  } | null;
};

export default function SettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      // Redirect freelancers to their dashboard - settings page hidden for freelancers
      if (user.role === 'freelancer') {
        router.push('/freelancer/dashboard');
        return;
      }
      fetchSummary();
      fetchProfilePicture();
      setFormData({
        name: user.name,
        phone: user.phone,
        email: user.email
      });
    }
  }, [user, loading, router]);

  const authHeader = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchSummary = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/summary`, {
        headers: {
          ...authHeader()
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchProfilePicture = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/profile-picture`, {
        headers: {
          ...authHeader()
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.profilePictureUrl) {
          setProfilePicture(data.profilePictureUrl);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile picture:', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        // Upload to server
        const response = await fetch(`/api/users/${user?.id}/profile-picture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader()
          },
          body: JSON.stringify({ imageData: base64String }),
        });

        if (response.ok) {
          setProfilePicture(base64String);
          toast.success('Profile picture updated successfully');
          refreshUser();
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to upload profile picture');
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setUploading(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Profile updated successfully');
        setEditMode(false);
        refreshUser();
        fetchSummary();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setUploading(false);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings & Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and view your performance statistics
          </p>
        </div>

        {loadingSummary ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : summary && (
          <div className="space-y-6">
            {/* Profile Picture Section */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Update your profile picture (Max 5MB, JPG/PNG)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {profilePicture ? (
                        <img 
                          src={profilePicture} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      variant="outline"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload New Picture'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Recommended: Square image, at least 200x200px
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your personal details and account status</CardDescription>
                </div>
                {!editMode && (
                  <Button onClick={() => setEditMode(true)} variant="outline">
                    Edit Profile
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} disabled={uploading}>
                        <Save className="w-4 h-4 mr-2" />
                        {uploading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button onClick={() => {
                        setEditMode(false);
                        setFormData({
                          name: user.name,
                          phone: user.phone,
                          email: user.email
                        });
                      }} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Full Name</p>
                        <p className="text-sm text-muted-foreground">{summary.user.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Email Address</p>
                        <p className="text-sm text-muted-foreground">{summary.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Phone Number</p>
                        <p className="text-sm text-muted-foreground">{summary.user.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Role</p>
                        <Badge variant="outline" className="capitalize mt-1">
                          {summary.user.role}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Account Status</p>
                        <Badge 
                          variant={summary.user.status === 'active' ? 'default' : 'destructive'} 
                          className="capitalize mt-1"
                        >
                          {summary.user.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Member Since</p>
                        <p className="text-sm text-muted-foreground">
                          {mounted ? new Date(summary.user.createdAt).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            {summary.user.role === 'freelancer' && (
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Current Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      KSh {summary.user.balance.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Total Earned
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      KSh {(summary.stats?.totalAmountEarned ?? summary.user.totalEarned ?? 0).toFixed(2)}
                    </div>
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
                    <div className="text-2xl font-bold text-yellow-600">
                      {summary.stats?.averageRating != null ? summary.stats.averageRating.toFixed(1) : summary.user.rating != null ? summary.user.rating.toFixed(1) : 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(summary.stats?.totalRatings ?? 0)} ratings
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {summary.user.role === 'client' && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                      Total Spent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      KSh {(summary.stats?.totalAmountSpent ?? summary.user.totalSpent ?? 0).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Jobs Posted
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {summary.stats?.totalJobsPosted ?? 0}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Performance Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Statistics</CardTitle>
                <CardDescription>Track your activity and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="text-2xl font-bold">{summary.user.completedJobs}</div>
                    <p className="text-sm text-muted-foreground">Completed Jobs</p>
                  </div>

                  {summary.user.role === 'freelancer' && (
                    <>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">
                          {summary.user.completionRate != null ? `${summary.user.completionRate.toFixed(1)}%` : 'N/A'}
                        </div>
                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                      </div>

                      <div className="text-center p-4 bg-muted rounded-lg">
                        <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                        <div className="text-2xl font-bold">{summary.stats?.onTimeDelivery ?? 0}</div>
                        <p className="text-sm text-muted-foreground">On-Time Deliveries</p>
                      </div>

                      <div className="text-center p-4 bg-muted rounded-lg">
                        <FileText className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold">{summary.stats?.revisionsRequested ?? 0}</div>
                        <p className="text-sm text-muted-foreground">Revisions Requested</p>
                      </div>
                    </>
                  )}

                  {summary.user.role === 'client' && (
                    <>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <FileText className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold">{summary.stats?.totalJobsCancelled ?? 0}</div>
                        <p className="text-sm text-muted-foreground">Cancelled Jobs</p>
                      </div>

                      <div className="text-center p-4 bg-muted rounded-lg">
                        <Star className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                        <div className="text-2xl font-bold">
                          {summary.stats?.averageRating != null ? summary.stats.averageRating.toFixed(1) : 'N/A'}
                        </div>
                        <p className="text-sm text-muted-foreground">Average Rating</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}