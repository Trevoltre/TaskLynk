"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InvoiceGenerator } from '@/components/invoice-generator';
import { format } from 'date-fns';
import { DollarSign, FileText, TrendingUp, Download, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

type Payment = {
  id: number;
  jobId: number;
  clientId: number;
  freelancerId: number;
  amount: number;
  mpesaCode: string | null;
  status: string;
  confirmedByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
};

type Job = {
  id: number;
  title: string;
  workType: string;
  amount: number;
  status: string;
};

type Transaction = {
  payment: Payment;
  job: Job;
};

export default function FreelancerFinancialOverviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [completedOrdersData, setCompletedOrdersData] = useState<{
    completedOrdersBalance: number;
    completedOrdersCount: number;
    averageOrderValue: number;
  } | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'freelancer') {
        router.push('/');
      } else {
        fetchTransactions();
        fetchCompletedOrdersBalance();
      }
    }
  }, [user, loading, router]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    setLoadingTransactions(true);
    try {
      const response = await fetch(`/api/payments?freelancerId=${user.id}`);
      if (response.ok) {
        const payments = await response.json();
        
        // Fetch job details for each payment
        const transactionsData = await Promise.all(
          payments.map(async (payment: Payment) => {
            const jobResponse = await fetch(`/api/jobs/${payment.jobId}`);
            const job = jobResponse.ok ? await jobResponse.json() : null;
            return { payment, job };
          })
        );
        
        setTransactions(transactionsData);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchCompletedOrdersBalance = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/freelancer/completed-orders-balance?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setCompletedOrdersData(data);
      }
    } catch (error) {
      console.error('Failed to fetch completed orders balance:', error);
    }
  };

  const handleRequestPayment = () => {
    toast.info('Payment request flow coming soon');
  };

  const unrequestedPayments = transactions.filter(
    t => t.payment.status === 'pending' && !t.payment.mpesaCode
  );
  
  const paymentRequests = transactions.filter(
    t => t.payment.status === 'pending' && t.payment.mpesaCode
  );
  
  const paymentHistory = transactions.filter(
    t => t.payment.status === 'confirmed'
  );

  const filteredTransactions = (list: Transaction[]) => {
    if (!searchTerm) return list;
    return list.filter(t => 
      t.job?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.payment.id.toString().includes(searchTerm) ||
      t.job?.id.toString().includes(searchTerm)
    );
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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Financial Overview</h1>
              <p className="text-muted-foreground">
                Track your earnings, payments, and financial transactions
              </p>
            </div>
            <Button onClick={handleRequestPayment} size="lg">
              Request Payment
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {(completedOrdersData?.completedOrdersBalance ?? user.balance ?? 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Available balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Orders Total</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KSh {completedOrdersData?.completedOrdersBalance?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From {completedOrdersData?.completedOrdersCount || 0} completed orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KSh {unrequestedPayments.reduce((sum, t) => sum + t.payment.amount, 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {unrequestedPayments.length} unrequested
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KSh {completedOrdersData?.averageOrderValue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per completed order</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Tabs */}
        <Tabs defaultValue="unrequested" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="unrequested">
              Unrequested
              {unrequestedPayments.length > 0 && (
                <Badge variant="destructive" className="ml-2">{unrequestedPayments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests">
              Payment Requests
              {paymentRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2">{paymentRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">
              Payment History
            </TabsTrigger>
            <TabsTrigger value="fines">
              Fines
            </TabsTrigger>
          </TabsList>

          {/* Search Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by order ID, title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="unrequested">
            <Card>
              <CardHeader>
                <CardTitle>Unrequested Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Order</th>
                        <th className="text-left py-3 px-4">Transaction Type</th>
                        <th className="text-left py-3 px-4">Comments</th>
                        <th className="text-right py-3 px-4">Value</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTransactions ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          </td>
                        </tr>
                      ) : filteredTransactions(unrequestedPayments).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-muted-foreground">
                            No unrequested payments
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions(unrequestedPayments).map(({ payment, job }) => (
                          <tr key={payment.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                            </td>
                            <td className="py-3 px-4">
                              <a href={`#${payment.jobId}`} className="text-blue-500 hover:underline">
                                #{payment.jobId}
                              </a>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs">
                                Order Completed (0 pages)
                              </span>
                            </td>
                            <td className="py-3 px-4 capitalize">{job?.workType || '-'}</td>
                            <td className="py-3 px-4 text-right font-semibold text-green-600">
                              KES {payment.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedPaymentId(payment.id)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Invoice
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Payment Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Order</th>
                        <th className="text-left py-3 px-4">Transaction Type</th>
                        <th className="text-left py-3 px-4">Comments</th>
                        <th className="text-right py-3 px-4">Value</th>
                        <th className="text-right py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTransactions ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          </td>
                        </tr>
                      ) : filteredTransactions(paymentRequests).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-muted-foreground">
                            No payment requests
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions(paymentRequests).map(({ payment, job }) => (
                          <tr key={payment.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                            </td>
                            <td className="py-3 px-4">
                              <a href={`#${payment.jobId}`} className="text-blue-500 hover:underline">
                                #{payment.jobId}
                              </a>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                                Payment Requested
                              </span>
                            </td>
                            <td className="py-3 px-4 capitalize">{job?.workType || '-'}</td>
                            <td className="py-3 px-4 text-right font-semibold text-green-600">
                              KES {payment.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Badge variant="secondary">Pending</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Order</th>
                        <th className="text-left py-3 px-4">Transaction Type</th>
                        <th className="text-left py-3 px-4">Comments</th>
                        <th className="text-right py-3 px-4">Value</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTransactions ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          </td>
                        </tr>
                      ) : filteredTransactions(paymentHistory).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-muted-foreground">
                            No payment history
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions(paymentHistory).map(({ payment, job }) => (
                          <tr key={payment.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              {format(new Date(payment.updatedAt), 'MMM dd, yyyy HH:mm')}
                            </td>
                            <td className="py-3 px-4">
                              <a href={`#${payment.jobId}`} className="text-blue-500 hover:underline">
                                #{payment.jobId}
                              </a>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                                Payment Confirmed
                              </span>
                            </td>
                            <td className="py-3 px-4 capitalize">{job?.workType || '-'}</td>
                            <td className="py-3 px-4 text-right font-semibold text-green-600">
                              KES {payment.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedPaymentId(payment.id)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Invoice
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fines">
            <Card>
              <CardHeader>
                <CardTitle>Fines & Deductions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  No fines or deductions recorded
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invoice Generator Dialog */}
      {selectedPaymentId && (
        <InvoiceGenerator
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        />
      )}
    </div>
  );
}