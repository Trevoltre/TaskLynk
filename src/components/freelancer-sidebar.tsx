"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Briefcase, ClipboardList, MessageSquare, DollarSign, Settings, Gavel, PauseCircle, PlayCircle, PenLine, CheckCircle2, PackageCheck, RotateCcw, Ban, BookOpen, ChevronDown, ChevronRight, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { ComponentType } from "react";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
};

type FreelancerSidebarContentProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

function FreelancerSidebarContent({ isOpen = true, onClose }: FreelancerSidebarContentProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Determine orders path and initialize state BEFORE any conditional returns to keep hook order consistent
  const isOrdersPath = pathname.startsWith("/freelancer/orders") || pathname.startsWith("/freelancer/bids") || pathname.startsWith("/freelancer/jobs");
  const [ordersOpen, setOrdersOpen] = useState<boolean>(isOrdersPath);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  }, [pathname, onClose]);

  // Only show for freelancers (after all hooks are declared)
  if (!user || user.role !== "freelancer") return null;

  const topItems: NavItem[] = [
    { href: "/freelancer/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/freelancer/jobs", label: "My Jobs", icon: ClipboardList, match: (p) => p.startsWith("/freelancer/jobs") },
    { href: "/freelancer/messages", label: "Messages", icon: MessageSquare, match: (p) => p.startsWith("/freelancer/messages") },
    { href: "/freelancer/guide", label: "Guide", icon: BookOpen },
    { href: "/freelancer/financial-overview", label: "Financial Overview", icon: DollarSign },
    { href: "/freelancer/settings", label: "Settings", icon: Settings },
  ];

  const currentStatus = searchParams?.get("status") || "";

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 md:top-[72px] left-0 z-50 md:z-0
        w-64 h-screen md:h-[calc(100vh-72px)]
        flex-shrink-0 border-r bg-sidebar text-sidebar-foreground
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        {/* Mobile Close Button */}
        <div className="md:hidden flex justify-end p-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-4 py-4 border-b">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Freelancer</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-base font-semibold line-clamp-1">{user.name}</p>
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ring-sidebar ${isOnline ? "bg-green-500" : "bg-red-500"}`}
              title={isOnline ? "Online" : "Offline"}
              aria-hidden="true"
            />
          </div>
          {typeof user.balance === "number" && (
            <p className="text-xs mt-1"><span className="text-muted-foreground">Balance:</span> <span className="font-semibold text-green-600">KSh {user.balance.toFixed(2)}</span></p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          <ul className="px-2 space-y-1">
            {/* Overview */}
            <li>
              <Link
                href="/freelancer/dashboard"
                className={`flex items-center gap-3 px-3 py-2 rounded-md border transition-colors ${pathname === "/freelancer/dashboard" ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="text-sm font-medium">Overview</span>
              </Link>
            </li>

            {/* Orders group */}
            <li>
              <button
                type="button"
                onClick={() => setOrdersOpen((v) => !v)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md border transition-colors ${isOrdersPath ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                aria-expanded={ordersOpen}
              >
                <span className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4" />
                  <span className="text-sm font-medium">Orders</span>
                </span>
                {ordersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {ordersOpen && (
                <ul className="mt-1 ml-8 space-y-1">
                  <li>
                    <Link
                      href="/freelancer/orders"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${pathname.startsWith("/freelancer/orders") ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                    >
                      <Briefcase className="h-3.5 w-3.5" /> Available Orders
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/freelancer/bids"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${pathname.startsWith("/freelancer/bids") ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                    >
                      <Gavel className="h-3.5 w-3.5" /> My Bids
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/freelancer/jobs?status=on-hold"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${pathname.startsWith("/freelancer/jobs") && currentStatus === "on-hold" ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                    >
                      <PauseCircle className="h-3.5 w-3.5" /> On Hold
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/freelancer/jobs?status=in-progress"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${pathname.startsWith("/freelancer/jobs") && currentStatus === "in-progress" ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                    >
                      <PlayCircle className="h-3.5 w-3.5" /> In Progress
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/freelancer/jobs?status=editing"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${pathname.startsWith("/freelancer/jobs") && currentStatus === "editing" ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                    >
                      <PenLine className="h-3.5 w-3.5" /> Editing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/freelancer/jobs?status=done"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${pathname.startsWith("/freelancer/jobs") && currentStatus === "done" ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/freelancer/jobs?status=delivered"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${pathname.startsWith("/freelancer/jobs") && currentStatus === "delivered" ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                    >
                      <PackageCheck className="h-3.5 w-3.5" /> Delivered
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/freelancer/jobs?status=revision"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${pathname.startsWith("/freelancer/jobs") && currentStatus === "revision" ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Revision
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/freelancer/jobs?status=approved"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${pathname.startsWith("/freelancer/jobs") && currentStatus === "approved" ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/freelancer/jobs?status=completed"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${pathname.startsWith("/freelancer/jobs") && currentStatus === "completed" ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/freelancer/jobs?status=cancelled"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${pathname.startsWith("/freelancer/jobs") && currentStatus === "cancelled" ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                    >
                      <Ban className="h-3.5 w-3.5" /> Cancelled
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Remaining top-level items */}
            {topItems.map(({ href, label, icon: Icon, match }) => {
              const isActive = match ? match(pathname) : pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md border transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent"}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-4 py-3 border-t text-xs text-muted-foreground">© {new Date().getFullYear()} TaskLynk</div>
      </aside>
    </>
  );
}

export const FreelancerSidebar = ({ isOpen = true, onClose }: FreelancerSidebarContentProps) => {
  return (
    <Suspense fallback={
      <aside className="w-64 flex-shrink-0 border-r bg-sidebar text-sidebar-foreground sticky top-[72px] h-[calc(100vh-72px)] hidden md:flex md:flex-col">
        <div className="px-4 py-4 border-b">
          <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
          <div className="mt-2 h-5 w-32 bg-muted animate-pulse rounded"></div>
        </div>
      </aside>
    }>
      <FreelancerSidebarContent isOpen={isOpen} onClose={onClose} />
    </Suspense>
  );
};