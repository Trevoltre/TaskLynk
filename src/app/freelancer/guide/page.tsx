import Link from "next/link";
import { ArrowRight, BookOpenCheck, Info, ListChecks, Workflow } from "lucide-react";

export const metadata = {
  title: "Freelancer Guide | TaskLynk",
};

export default function FreelancerGuidePage() {
  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Freelancer Guide</h1>
        <p className="text-muted-foreground mt-1">How orders, bids, messaging, and delivery work on TaskLynk.</p>
      </header>

      <section className="rounded-lg border bg-card text-card-foreground p-5">
        <div className="flex items-center gap-2 mb-3">
          <Workflow className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Order lifecycle</h2>
        </div>
        <ol className="list-decimal ml-5 space-y-2 text-sm leading-6">
          <li>
            <strong>Available</strong>: Admin-approved orders appear in <Link href="/freelancer/orders" className="text-primary underline underline-offset-4">Available Orders</Link>. You can search and bid.
          </li>
          <li>
            <strong>On Hold</strong>: Temporarily paused; wait for admin updates.
          </li>
          <li>
            <strong>In Progress</strong>: After admin assigns an order you bid on, it moves to <Link href="/freelancer/jobs?status=in-progress" className="text-primary underline underline-offset-4">In Progress</Link>.
          </li>
          <li>
            <strong>Editing</strong>: You’re revising or polishing the work before submitting as done.
          </li>
          <li>
            <strong>Done</strong>: You’ve uploaded your completed work for admin review.
          </li>
          <li>
            <strong>Delivered</strong>: Admin has delivered the work to the client.
          </li>
          <li>
            <strong>Revision</strong>: Client requested changes; respond and re-upload.
          </li>
          <li>
            <strong>Approved</strong>: Work accepted by admin and client.
          </li>
          <li>
            <strong>Completed</strong>: Final state; earnings added to your balance.
          </li>
          <li>
            <strong>Cancelled</strong>: Only admins can cancel at any time.
          </li>
        </ol>
      </section>

      <section className="rounded-lg border bg-card text-card-foreground p-5">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Bidding and assignments</h2>
        </div>
        <ul className="list-disc ml-5 space-y-2 text-sm leading-6">
          <li>
            Place bids from the <Link href="/freelancer/orders" className="text-primary underline underline-offset-4">Available Orders</Link> page; competitive bids are more likely to win.
          </li>
          <li>
            Once you place a bid, that order disappears from your available list and appears under <Link href="/freelancer/bids" className="text-primary underline underline-offset-4">My Bids</Link>.
          </li>
          <li>
            Admin reviews bids and assigns orders. Assigned orders move to <Link href="/freelancer/jobs?status=in-progress" className="text-primary underline underline-offset-4">In Progress</Link>.
          </li>
        </ul>
      </section>

      <section className="rounded-lg border bg-card text-card-foreground p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpenCheck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Working and delivering</h2>
        </div>
        <ul className="list-disc ml-5 space-y-2 text-sm leading-6">
          <li>Upload drafts or final files under the assigned order’s page. All common file types are supported.</li>
          <li>Admin reviews your submission; if approved it’s delivered to the client. If revisions are needed, you’ll see it under Revision.</li>
          <li>After client approval, the order is marked Completed and your balance updates accordingly.</li>
        </ul>
      </section>

      <section className="rounded-lg border bg-card text-card-foreground p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Messaging and conduct</h2>
        </div>
        <ul className="list-disc ml-5 space-y-2 text-sm leading-6">
          <li>Use <Link href="/freelancer/messages" className="text-primary underline underline-offset-4">Messages</Link> for communication; messages are moderated and require approval before being visible to the other party.</li>
          <li>Keep communication professional and job-focused. Don’t share personal contact info.</li>
        </ul>
      </section>

      <section className="rounded-lg border bg-card text-card-foreground p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Quick links</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <Link href="/freelancer/orders" className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted transition">
            Browse Available Orders <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/freelancer/bids" className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted transition">
            View My Bids <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/freelancer/jobs" className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted transition">
            My Jobs <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/freelancer/jobs?status=delivered" className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted transition">
            Delivered Orders <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/freelancer/jobs?status=revision" className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted transition">
            Revision Requests <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/freelancer/financial-overview" className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted transition">
            Financial Overview <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
