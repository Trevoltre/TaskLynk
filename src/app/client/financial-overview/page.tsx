"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, PlusCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface TransactionItem {
  id: number;
  amount: number;
  status: string;
  paymentMethod: string | null;
  confirmedAt: string | null;
  createdAt: string;
  job: {
    id: number | null;
    displayId: string | null;
    title: string | null;
    status: string | null;
  } | null;
}

export default function ClientFinancialOverviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<{
    totalSpent: number;
    currentBalance: number;
    totalOrders: number;
    completedOrders: number;
    pendingPayments: number;
  } | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Add Funds form state (Payment Request)
  const [amount, setAmount] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== "client") {
        router.push("/");
      } else {
        fetchFinancials();
      }
    }
  }, [user, loading, router]);

  const fetchFinancials = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const ts = Date.now();
      const res = await fetch(`/api/clients/${user.id}/financial-history?limit=50&_=${ts}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error("Failed to fetch financials", e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreatePaymentRequest = async () => {
    if (!user) return;

    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error("Enter your M-Pesa phone number");
      return;
    }
    if (!transactionRef.trim()) {
      toast.error("Enter your M-Pesa transaction reference");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: user.id,
          amount: Number(amount),
          paymentMethod: "mpesa",
          phoneNumber: phoneNumber.trim(),
          transactionReference: transactionRef.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to submit payment request");
      } else {
        toast.success("Payment request submitted! Admin will review shortly.");
        setAmount(0);
        setTransactionRef("");
        // keep phone prefilled for convenience
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit payment request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Financial Overview</h1>
          <p className="text-muted-foreground">Balance, transactions, and add funds</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Wallet Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {summary?.currentBalance?.toFixed(2) || "0.00"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh {summary?.totalSpent?.toFixed(2) || "0.00"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalOrders || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Completed Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.completedOrders || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Funds (Payment Request) */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Add Funds (Payment Request)
            </CardTitle>
            <CardDescription>
              Submit your payment details and admin will confirm to credit your wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 items-end">
              <div>
                <Label htmlFor="amount">Amount (KSh)</Label>
                <Input id="amount" type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="e.g. 2000" />
              </div>
              <div>
                <Label htmlFor="phone">M-Pesa Phone</Label>
                <Input id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g. 0712345678" />
              </div>
              <div>
                <Label htmlFor="ref">Transaction Ref</Label>
                <Input id="ref" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="e.g. QFT12345XY" />
              </div>
              <div>
                <Button className="w-full" onClick={handleCreatePaymentRequest} disabled={submitting}>
                  {submitting ? "Submitting..." : (
                    <span className="inline-flex items-center"><PlusCircle className="w-4 h-4 mr-2" /> Submit Request</span>
                  )}
                </Button>
              </div>
            </div>
            <Alert className="mt-4">
              <AlertDescription>
                Once confirmed by admin, the amount will reflect in your wallet balance.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Your recent payments with order references</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="text-center py-10">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No transactions yet</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{format(new Date(t.createdAt), "MMM dd, yyyy HH:mm")}</TableCell>
                        <TableCell className="font-semibold">KSh {Number(t.amount || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === "confirmed" ? "default" : t.status === "failed" ? "destructive" : "secondary"} className="capitalize">
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{t.paymentMethod || "-"}</TableCell>
                        <TableCell>
                          {t.job?.id ? (
                            <span className="text-sm">
                              {t.job.displayId ? `#${t.job.displayId}` : `#${t.job.id}`} – {t.job.title || "Order"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
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
  );
}
