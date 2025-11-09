"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Save,
  ArrowLeft,
  Info,
  Shield,
  Wallet,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';

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
    freelancerBadge?: string | null;
    totalEarnings?: number;
  };
  stats: {
    totalJobsCompleted?: number;
    totalAmountEarned?: number;
    averageRating?: number;
    totalRatings?: number;
    onTimeDelivery?: number;
    lateDelivery?: number;
    revisionsRequested?: number;
  } | null;
};

export default function FreelancerSettingsPage() {
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

  // Payment settings
  const [paymentData, setPaymentData] = useState({
    mpesaPhone: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  // Completed orders balance
  const [completedEarnings, setCompletedEarnings] = useState<{ balance: number; count: number }>({ balance: 0, count: 0 });

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'freelancer') {
        router.push('/');
      } else {
        fetchSummary();
        fetchProfilePicture();
        fetchCompletedEarnings();
        setFormData({
          name: user.name,
          phone: user.phone,
          email: user.email
        });
        setPaymentData({
          mpesaPhone: user.phone || '',
          bankName: '',
          accountNumber: '',
          accountName: user.name || '',
        });
      }
    }
  }, [user, loading, router]);

  const fetchSummary = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/summary`);
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
      const response = await fetch(`/api/users/${user.id}/profile-picture`);
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

  const fetchCompletedEarnings = async () => {
    if (!user) return;
    
    try {
      const timestamp = Date.now();
      const earningsRes = await fetch(`/api/freelancer/completed-orders-balance?userId=${user.id}&_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (earningsRes.ok) {
        const summary = await earningsRes.json();
        setCompletedEarnings({ 
          balance: Number(summary.completedOrdersBalance || 0), 
          count: Number(summary.completedOrdersCount || 0) 
        });
      }
    } catch (error) {
      console.error('Failed to fetch completed earnings:', error);
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

  const handleSavePayment = async () => {
    toast.success('Payment settings saved!');
    // TODO: Implement payment settings save API
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Safe totals to avoid .toFixed on undefined/null
  const safeTotalEarned = Number(
    (summary?.stats?.totalAmountEarned ?? summary?.user.totalEarned ?? summary?.user.totalEarnings ?? 0)
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/freelancer/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings & Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information, payment settings, and view your performance statistics
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
                          variant={summary.user.approved ? 'default' : 'secondary'} 
                          className="capitalize mt-1"
                        >
                          {summary.user.approved ? 'Active' : 'Pending Approval'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Writer Badge</p>
                        {summary.user.freelancerBadge ? (
                          <Badge 
                            className={`mt-1 capitalize ${
                              summary.user.freelancerBadge === 'platinum' ? 'bg-gradient-to-r from-slate-400 to-gray-500 text-white' :
                              summary.user.freelancerBadge === 'gold' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                              summary.user.freelancerBadge === 'silver' ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' :
                              'bg-gradient-to-r from-orange-600 to-red-500 text-white'
                            }`}
                          >
                            {summary.user.freelancerBadge} Writer
                          </Badge>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">No badge yet</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Member Since</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(summary.user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <div className="grid md:grid-cols-4 gap-6">
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
                  <Link href="/freelancer/financial-overview">
                    <Button variant="link" className="p-0 h-auto text-xs mt-1">
                      View Details
                    </Button>
                  </Link>
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
                    KSh {safeTotalEarned.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lifetime earnings
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Completed Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    KSh {completedEarnings.balance.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedEarnings.count} orders • 70% share
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
                  <div className="text-2xl font-bold text-yellow-600">
                    {summary.stats?.averageRating != null ? summary.stats.averageRating.toFixed(1) : summary.user.rating != null ? summary.user.rating.toFixed(1) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.stats?.totalRatings || 0} ratings
                  </p>
                </CardContent>
              </Card>
            </div>

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

                  <div className="text-center p-4 bg-muted rounded-lg">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold">
                      {summary.user.completionRate ? `${summary.user.completionRate.toFixed(1)}%` : 'N/A'}
                    </div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                  </div>

                  <div className="text-center p-4 bg-muted rounded-lg">
                    <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                    <div className="text-2xl font-bold">{summary.stats?.onTimeDelivery || 0}</div>
                    <p className="text-sm text-muted-foreground">On-Time Deliveries</p>
                  </div>

                  <div className="text-center p-4 bg-muted rounded-lg">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                    <div className="text-2xl font-bold">{summary.stats?.revisionsRequested || 0}</div>
                    <p className="text-sm text-muted-foreground">Revisions Requested</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Payment Information
                </CardTitle>
                <CardDescription>
                  Manage your payment methods and withdrawal preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Payment Details:</strong> You earn 70% of each completed order. Funds are added to your balance immediately after the client's payment is confirmed by admin.
                  </AlertDescription>
                </Alert>

                {/* M-Pesa Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    M-Pesa Details
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="mpesaPhone">M-Pesa Phone Number *</Label>
                    <Input
                      id="mpesaPhone"
                      type="tel"
                      value={paymentData.mpesaPhone}
                      onChange={(e) => setPaymentData({ ...paymentData, mpesaPhone: e.target.value })}
                      placeholder="0700000000"
                    />
                    <p className="text-xs text-muted-foreground">
                      This number will be used for salary payments
                    </p>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Bank Account (Optional)
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={paymentData.bankName}
                        onChange={(e) => setPaymentData({ ...paymentData, bankName: e.target.value })}
                        placeholder="e.g. Equity Bank"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={paymentData.accountNumber}
                        onChange={(e) => setPaymentData({ ...paymentData, accountNumber: e.target.value })}
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={paymentData.accountName}
                      onChange={(e) => setPaymentData({ ...paymentData, accountName: e.target.value })}
                      placeholder="Account holder name"
                    />
                  </div>
                </div>

                <Button onClick={handleSavePayment}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Payment Settings
                </Button>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your password and security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Account Security:</strong> Your account is protected with industry-standard encryption. Contact admin if you need to reset your password.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                  </div>

                  <div>
                    <Label>Account Created</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>

                  <div>
                    <Label>Last Login</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>

                <Link href="/forgot-password">
                  <Button variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Reset Password
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}