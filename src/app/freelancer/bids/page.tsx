"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gavel, Search, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

 type Bid = {
  id: number;
  jobId: number;
  freelancerId: number;
  message: string;
  bidAmount: number;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};

function FreelancerBidsContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== "freelancer") {
        router.push("/");
      } else if (!user.approved) {
        router.push("/freelancer/dashboard");
      } else {
        fetchBids();
        const interval = setInterval(fetchBids, 10000);
        return () => clearInterval(interval);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const fetchBids = async () => {
    if (!user) return;
    setLoadingBids(true);
    try {
      const url = `/api/bids?freelancerId=${user.id}` + (statusFilter !== "all" ? `&status=${statusFilter}` : "");
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBids(data);
      }
    } catch (e) {
      console.error("Failed to load bids", e);
    } finally {
      setLoadingBids(false);
    }
  };

  // Re-fetch when status filter changes
  useEffect(() => {
    if (user && user.role === "freelancer" && user.approved) {
      fetchBids();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredBids = useMemo(() => {
    if (!query) return bids;
    const q = query.toLowerCase();
    return bids.filter((b) => b.message.toLowerCase().includes(q));
  }, [bids, query]);

  const pendingCount = useMemo(() => bids.filter((b) => b.status === "pending").length, [bids]);
  const acceptedCount = useMemo(() => bids.filter((b) => b.status === "accepted").length, [bids]);
  const rejectedCount = useMemo(() => bids.filter((b) => b.status === "rejected").length, [bids]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">My Bids</h1>
        <p className="text-sm text-muted-foreground">Review and manage your bids. Track responses from admin and view assignment status.</p>
      </div>

      {/* Bid Status Info Alert */}
      <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <strong>Bid Workflow:</strong> Pending bids await admin review. Accepted bids move to "In Progress". Rejected bids remain visible for your records.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting admin decision</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Job assigned to you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Not selected this time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bids.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3">
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-7">
              <label className="text-xs text-muted-foreground mb-1 block">Search message</label>
              <Input placeholder="Search within your bid message" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="lg:col-span-2 flex justify-end">
              <Button type="button" className="gap-2" onClick={fetchBids}><Search className="h-4 w-4" /> Refresh</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loadingBids ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : filteredBids.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No bids to show</p>
            {statusFilter !== "all" && (
              <Button variant="link" onClick={() => setStatusFilter("all")} className="mt-2">
                View all bids
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Bid</TableHead>
                <TableHead>Job</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Message</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBids.map((b) => {
                const statusVariant = b.status === "accepted" ? "default" : b.status === "rejected" ? "destructive" : "secondary";
                const linkHref = b.status === "accepted" ? `/freelancer/jobs/${b.jobId}` : `/freelancer/orders/${b.jobId}`;
                
                return (
                  <TableRow key={b.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm text-primary font-semibold">#{b.id}</TableCell>
                    <TableCell>
                      <span className="block text-sm font-medium">Job #{b.jobId}</span>
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">KSh {b.bidAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant as any} className="capitalize">
                        {b.status === "accepted" && "✓ "}
                        {b.status === "rejected" && "✗ "}
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[360px] truncate text-muted-foreground">{b.message || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{format(new Date(b.createdAt), "MMM dd, yyyy HH:mm")}</TableCell>
                    <TableCell className="text-right">
                      <Link href={linkHref} className="text-primary hover:underline font-medium">
                        {b.status === "accepted" ? "View Job" : "View Order"}
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function FreelancerBidsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <FreelancerBidsContent />
    </Suspense>
  );
}