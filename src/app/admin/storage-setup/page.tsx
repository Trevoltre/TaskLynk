"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { LeftNav } from '@/components/left-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2, Database, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type BucketResult = {
  bucket: string;
  status: 'created' | 'already_exists' | 'error';
  message: string;
  public: boolean;
};

type SetupResult = {
  success: boolean;
  results: BucketResult[];
  summary: {
    total: number;
    created: number;
    existing: number;
    errors: number;
  };
};

export default function StorageSetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    router.push('/');
    return null;
  }

  const handleSetup = async () => {
    setProcessing(true);
    setError(null);
    setSetupResult(null);

    try {
      const response = await fetch('/api/supabase/setup-buckets', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setSetupResult(data);
        
        if (data.summary.errors === 0) {
          toast.success('Storage buckets setup completed successfully!');
        } else {
          toast.error(`Setup completed with ${data.summary.errors} error(s)`);
        }
      } else {
        setError(data.error || 'Failed to set up storage buckets');
        toast.error(data.error || 'Failed to set up storage buckets');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <DashboardNav />
      <LeftNav 
        role="admin" 
        userName={user?.name || ''} 
        userRole={user?.role || 'admin'}
      />
      <div className="min-h-screen bg-background ml-64 transition-all duration-300 pb-20">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Supabase Storage Setup</h1>
            <p className="text-muted-foreground">
              Set up storage buckets for file uploads across the platform
            </p>
          </div>

          {/* Information Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                About Storage Buckets
              </CardTitle>
              <CardDescription>
                This will create three storage buckets in your Supabase project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">job-files</p>
                    <p className="text-sm text-muted-foreground">
                      Stores initial files from clients and completed work from freelancers (40MB limit)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">profile-pictures</p>
                    <p className="text-sm text-muted-foreground">
                      Stores user profile pictures (5MB limit)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">documents</p>
                    <p className="text-sm text-muted-foreground">
                      Stores invoices, receipts, and other documents (40MB limit)
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> All buckets will be set to <strong>public</strong> to allow file downloads. 
                  If buckets already exist, they won't be modified.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleSetup}
                disabled={processing}
                size="lg"
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Setting up storage buckets...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5 mr-2" />
                    Set Up Storage Buckets
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Results Display */}
          {setupResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {setupResult.summary.errors === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                  Setup Results
                </CardTitle>
                <CardDescription>
                  {setupResult.summary.created > 0 && `${setupResult.summary.created} created • `}
                  {setupResult.summary.existing > 0 && `${setupResult.summary.existing} already exist • `}
                  {setupResult.summary.errors > 0 && `${setupResult.summary.errors} errors`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {setupResult.results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        result.status === 'created' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' :
                        result.status === 'already_exists' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' :
                        'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {result.status === 'created' && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {result.status === 'already_exists' && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{result.bucket}</p>
                          <Badge variant={result.public ? 'default' : 'secondary'} className="text-xs">
                            {result.public ? 'Public' : 'Private'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {setupResult.summary.errors === 0 && (
                  <Alert className="mt-4 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900 dark:text-green-100">
                      <strong>Success!</strong> All storage buckets are ready. You can now upload files across the platform.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manual Setup Link */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Manual Setup (Alternative)</CardTitle>
              <CardDescription>
                If automated setup doesn't work, you can create buckets manually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => window.open('https://supabase.com/dashboard/project/iwpmlbomegvjofssieval/storage/buckets', '_blank')}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Supabase Storage Dashboard
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Create buckets: <code className="bg-muted px-1.5 py-0.5 rounded">job-files</code>, 
                <code className="bg-muted px-1.5 py-0.5 rounded ml-1">profile-pictures</code>, 
                <code className="bg-muted px-1.5 py-0.5 rounded ml-1">documents</code>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
