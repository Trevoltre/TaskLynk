"use client";

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { NotificationBell } from '@/components/notification-bell';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { LogOut, Star, User, Settings, DollarSign, Menu, X, ChevronDown } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState, Suspense } from 'react';

type DashboardNavContentProps = {
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
};

function DashboardNavContent({ onMenuClick, sidebarOpen = false }: DashboardNavContentProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // FIXED: Initialize with true to avoid hydration mismatch, update after mount
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Update online status after mount to avoid hydration mismatch
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Derive a readable page title from the current route (must be before any conditional returns to keep hooks order stable)
  const pageTitle = useMemo(() => {
    if (!pathname) return '';

    // Freelancer routes
    if (pathname.startsWith('/freelancer')) {
      if (pathname === '/freelancer/dashboard') return 'Overview';
      if (pathname.startsWith('/freelancer/orders')) return 'Available Orders';
      if (pathname.startsWith('/freelancer/bids')) return 'My Bids';
      if (pathname.startsWith('/freelancer/jobs')) {
        const status = (searchParams.get('status') || '').replace('-', ' ');
        if (pathname.match(/^\/freelancer\/jobs\/[0-9]+/)) return 'Job Detail';
        return status ? `My Jobs • ${status.replace(/\b\w/g, c => c.toUpperCase())}` : 'My Jobs';
      }
      if (pathname.startsWith('/freelancer/messages')) return 'Messages';
      if (pathname.startsWith('/freelancer/guide')) return 'Guide';
      if (pathname.startsWith('/freelancer/financial-overview')) return 'Financial Overview';
      if (pathname.startsWith('/freelancer/settings')) return 'Settings';
    }

    // Client routes
    if (pathname.startsWith('/client')) {
      if (pathname === '/client/dashboard') return 'Client Overview';
      if (pathname.startsWith('/client/new-job')) return 'Post a Job';
      if (pathname.startsWith('/client/jobs')) return pathname.match(/^\/client\/jobs\/[0-9]+/) ? 'Order Detail' : 'My Orders';
      if (pathname.startsWith('/client/messages')) return 'Messages';
      if (pathname.startsWith('/client/settings')) return 'Settings';
    }

    // Admin routes
    if (pathname.startsWith('/admin')) {
      if (pathname.startsWith('/admin/dashboard')) return 'Admin Dashboard';
      if (pathname.startsWith('/admin/jobs')) return pathname.match(/^\/admin\/jobs\/[0-9]+/) ? 'Manage Job' : 'Manage Jobs';
      if (pathname.startsWith('/admin/users')) return 'Manage Users';
      if (pathname.startsWith('/admin/messages')) return 'Admin Messages';
      if (pathname.startsWith('/admin/invoices') || pathname.startsWith('/admin/payments')) return 'Manage Invoices';
    }

    if (pathname.startsWith('/settings')) return 'Settings';
    if (pathname.startsWith('/profile')) return 'Profile';

    // Fallback: Title Case last segment
    const parts = pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    return last.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }, [pathname, searchParams]);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Determine dashboard path based on user role
  const dashboardPath = 
    user.role === 'admin' ? '/admin/dashboard' :
    user.role === 'client' ? '/client/dashboard' :
    user.role === 'freelancer' ? '/freelancer/dashboard' : '/';

  // Show menu button only for roles with sidebars (freelancer, client, admin with LeftNav)
  const showMenuButton = user.role === 'freelancer';

  return (
    <nav className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-50 min-h-[72px]">
      <div className="w-full px-2 sm:px-4 lg:px-8 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center min-w-0 gap-1 sm:gap-2">
            {/* Menu Button for Mobile - Toggle between Menu and X icons */}
            {showMenuButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className="md:hidden h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            
            <Link href={dashboardPath} className="flex items-center gap-2 flex-shrink-0">
              <div className="dark:bg-gray-900 dark:px-1 sm:dark:px-2 dark:py-1 dark:rounded-lg dark:border dark:border-gray-800">
                <Image
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/Revised-logo-1761824652421.png?width=8000&height=8000&resize=contain"
                  alt="TaskLynk Logo"
                  width={150}
                  height={48}
                  className="h-8 sm:h-10 md:h-12 w-auto dark:brightness-110 dark:contrast-125"
                  style={{ width: 'auto', height: '2rem' }}
                  priority
                />
              </div>
            </Link>
            {/* Page Title - Hidden on small screens */}
            <div className="hidden lg:block px-2 xl:px-4">
              <h1 className="text-sm lg:text-base xl:text-lg font-semibold leading-tight truncate max-w-[30vw] xl:max-w-[40vw]">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
            {user.displayId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden lg:flex items-center gap-1.5 px-2 xl:px-3 py-1 xl:py-1.5 bg-primary/10 rounded-md border border-primary/20 hover:bg-primary/20 transition-colors h-auto">
                    <span className="text-[10px] xl:text-xs font-medium text-muted-foreground">ID:</span>
                    <span className="text-xs xl:text-sm font-bold text-primary font-mono">{user.displayId}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Display ID</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2">
                    <p className="text-sm text-muted-foreground mb-1">Your unique ID:</p>
                    <p className="text-base font-bold text-primary font-mono">{user.displayId}</p>
                    <p className="text-xs text-muted-foreground mt-2">Use this ID for tracking orders and communication.</p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {user.role === 'freelancer' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border-2 border-green-500/30 hover:border-green-500/50 transition-all group h-auto">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col items-start">
                      <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Balance</span>
                      <span className="text-xs sm:text-sm md:text-base font-bold text-green-600">KSh {(user.balance ?? 0).toFixed(0)}</span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Financial Overview</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-3 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Current Balance</p>
                      <p className="text-xl font-bold text-green-600">KSh {(user.balance ?? 0).toFixed(2)}</p>
                    </div>
                    {user.rating !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Your Rating</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <p className="text-base font-semibold">{user.rating.toFixed(1)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/freelancer/financial-overview" className="cursor-pointer">
                      View Full Financial Overview
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {user.rating !== null && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden sm:flex items-center gap-1 px-2 py-1 hover:bg-accent rounded-md transition-colors h-auto">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs sm:text-sm font-semibold">{user.rating.toFixed(1)}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Your Rating</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <p className="text-2xl font-bold">{user.rating.toFixed(1)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Based on completed orders and client feedback.</p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <NotificationBell />
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring" aria-label="Open profile menu">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 bg-sidebar-accent/20 text-sidebar-foreground border border-sidebar-border">
                    <AvatarFallback className="text-xs sm:text-sm text-sidebar-foreground bg-transparent">{initials}</AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute -top-0.5 -right-0.5 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ring-2 ring-sidebar ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
                    aria-hidden="true"
                    title={isOnline ? 'Online' : 'Offline'}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {user.displayId && (
                      <p className="text-xs font-mono text-primary font-semibold">
                        {user.displayId}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role}
                    </p>
                    {user.role === 'freelancer' && (
                      <div className="pt-2 mt-2 border-t">
                        <p className="text-xs text-muted-foreground">Current Balance</p>
                        <p className="text-sm font-bold text-green-600">KSh {(user.balance ?? 0).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Edit Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  {/* Route settings per role */}
                  <Link href={user.role === 'freelancer' ? 
                    "/freelancer/settings" : user.role === 'client' ? 
                    "/client/settings" : 
                    "/settings"} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function DashboardNav({ onMenuClick, sidebarOpen = false }: DashboardNavContentProps) {
  return (
    <Suspense fallback={
      <nav className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-50 min-h-[72px]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <div className="h-12 w-32 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 bg-muted animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      </nav>
    }>
      <DashboardNavContent onMenuClick={onMenuClick} sidebarOpen={sidebarOpen} />
    </Suspense>
  );
}