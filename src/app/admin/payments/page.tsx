"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { LeftNav } from '@/components/left-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceGenerator } from '@/components/invoice-generator';
import { CheckCircle, XCircle, FileText, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
};

type PaymentRequest = {
  id: number;
  clientId: number;
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected';
  paymentMethod: string;
  phoneNumber: string;
  transactionReference: string;
  createdAt: string;
  confirmedAt?: string | null;
  rejectionReason?: string | null;
  client: { id: number; name: string; email: string };
};

export default function AdminPaymentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        fetchPayments();
        fetchPaymentRequests();
      }
    }
  }, [user, loading, router]);

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/payments');
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      const res = await fetch('/api/payment-requests?status=pending');
      if (res.ok) {
        const data = await res.json();
        setPaymentRequests(data);
      }
    } catch (e) {
      console.error('Failed to fetch payment requests:', e);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleConfirm = async (paymentId: number) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });

      if (response.ok) {
        fetchPayments();
      }
    } catch (error) {
      console.error('Failed to confirm payment:', error);
    }
  };

  const handleReject = async (paymentId: number) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: false }),
      });

      if (response.ok) {
        fetchPayments();
      }
    } catch (error) {
      console.error('Failed to reject payment:', error);
    }
  };

  // Payment Request actions
  const confirmRequest = async (id: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/payment-requests/${id}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id })
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d?.error || 'Failed to confirm request');
      } else {
        toast.success('Payment request confirmed and client wallet credited');
        fetchPaymentRequests();
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to confirm request');
    }
  };

  const rejectRequest = async (id: number) => {
    if (!user) return;
    try {
      const reason = rejectionReasons[id]?.trim();
      if (!reason) {
        toast.error('Enter a rejection reason');
        return;
      }
      const res = await fetch(`/api/payment-requests/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, rejectionReason: reason })
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d?.error || 'Failed to reject request');
      } else {
        toast.success('Payment request rejected');
        setRejectionReasons(prev => ({ ...prev, [id]: '' }));
        fetchPaymentRequests();
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to reject request');
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
          <h1 className="text-3xl font-bold mb-2">Payment Management</h1>
          <p className="text-muted-foreground">
            Review and confirm M-Pesa payments from clients
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Payments</CardTitle>
            <CardDescription>
              Verify M-Pesa transaction codes and confirm payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPayments ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No payments found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>M-Pesa Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">#{payment.jobId}</TableCell>
                        <TableCell className="font-semibold">
                          KSh {payment.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {payment.mpesaCode || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === 'confirmed'
                                ? 'default'
                                : payment.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="capitalize"
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {payment.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirm(payment.id)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(payment.id)}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {payment.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedPaymentId(payment.id)}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Invoice
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

        {/* Payment Requests Management */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Payment Requests</CardTitle>
              <CardDescription>Confirm or reject client-submitted wallet top-ups</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : paymentRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No pending payment requests</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Rejection Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentRequests.map((pr) => (
                        <TableRow key={pr.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{pr.client?.name || `Client #${pr.clientId}`}</span>
                              <span className="text-xs text-muted-foreground">{pr.client?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">KSh {Number(pr.amount).toFixed(2)}</TableCell>
                          <TableCell>{pr.phoneNumber}</TableCell>
                          <TableCell className="font-mono">{pr.transactionReference}</TableCell>
                          <TableCell>{format(new Date(pr.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                          <TableCell className="min-w-[220px]">
                            <Input
                              placeholder="Reason (required for reject)"
                              value={rejectionReasons[pr.id] || ''}
                              onChange={(e) => setRejectionReasons(prev => ({ ...prev, [pr.id]: e.target.value }))}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => confirmRequest(pr.id)}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Confirm
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectRequest(pr.id)}>
                                <XCircle className="w-4 h-4 mr-1" /> Reject
                              </Button>
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
        </div>
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