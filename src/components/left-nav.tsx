"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Home, 
  ShoppingBag, 
  FileText, 
  MessageSquare, 
  CreditCard, 
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Receipt,
  FileEdit,
  Mail,
  TrendingUp,
  Database,
  UserCog,
  Building,
  Briefcase,
  Shield
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  submenu?: NavItem[];
};

type LeftNavProps = {
  role: 'freelancer' | 'admin' | 'client';
  userName: string;
  userRole: string;
  items?: NavItem[];
};

const defaultFreelancerItems: NavItem[] = [
  { title: 'Overview', href: '/freelancer/dashboard', icon: Home },
  { title: 'Available Orders', href: '/freelancer/orders', icon: ShoppingBag },
  { title: 'Active Orders', href: '/freelancer/jobs', icon: FileText },
  { title: 'Financial Overview', href: '/freelancer/financial-overview', icon: DollarSign },
  { title: 'Messages', href: '/freelancer/messages', icon: MessageSquare },
];

const defaultAdminItems: NavItem[] = [
  { title: 'Overview', href: '/admin/dashboard', icon: Home },
  { title: 'Progress Summary', href: '/admin/progress', icon: TrendingUp },
  { title: 'Orders', href: '/admin/jobs', icon: ShoppingBag },
  { 
    title: 'Users', 
    href: '/admin/users', 
    icon: Users,
    submenu: [
      { title: 'All Users', href: '/admin/users', icon: Users },
      { title: 'Account Owners', href: '/admin/users?filter=approved&role=client&accountOwner=yes', icon: Building },
      { title: 'Regular Clients', href: '/admin/users?filter=approved&role=client&accountOwner=no', icon: UserCog },
      { title: 'Freelancers', href: '/admin/users?filter=approved&role=freelancer', icon: Briefcase },
      { title: 'Admins', href: '/admin/users?filter=approved&role=admin', icon: Shield },
    ]
  },
  { title: 'Revisions', href: '/admin/revisions', icon: FileEdit },
  { title: 'Payments', href: '/admin/payments', icon: CreditCard },
  { title: 'Messages', href: '/admin/messages', icon: MessageSquare },
  { title: 'Email Management', href: '/admin/emails', icon: Mail },
  { title: 'Storage Setup', href: '/admin/storage-setup', icon: Database },
];

const defaultClientItems: NavItem[] = [
  { title: 'Overview', href: '/client/dashboard', icon: Home },
  { title: 'My Jobs', href: '/client/dashboard#my-jobs', icon: FileText },
  { title: 'Messages', href: '/client/messages', icon: MessageSquare },
];

export function LeftNav({ role, userName, userRole, items }: LeftNavProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  const navItems = items || 
    (role === 'freelancer' ? defaultFreelancerItems : 
     role === 'admin' ? defaultAdminItems : 
     defaultClientItems);

  // Auto-expand submenu if current path matches any submenu item
  useEffect(() => {
    navItems.forEach(item => {
      if (item.submenu) {
        const hasActiveSubmenu = item.submenu.some(subItem => 
          pathname.startsWith(subItem.href) || pathname === subItem.href
        );
        if (hasActiveSubmenu && !expandedItems.includes(item.title)) {
          setExpandedItems(prev => [...prev, item.title]);
        }
      }
    });
  }, [pathname, navItems]);

  const toggleExpanded = (itemTitle: string) => {
    setExpandedItems(prev => 
      prev.includes(itemTitle) 
        ? prev.filter(t => t !== itemTitle)
        : [...prev, itemTitle]
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-[72px] h-[calc(100vh-72px)] bg-sidebar border-r border-sidebar-border transition-all duration-300 z-30 shadow-sm",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b border-sidebar-border flex items-center justify-between bg-sidebar/50">
          {!collapsed && (
            <div className="flex-1 min-w-0 pr-2">
              {/* Hide logo in admin sidebar; it should only appear in top horizontal bar */}
              {role !== 'admin' && (
                <div className="mb-2">
                  <Image
                    src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/Revised-logo-1761824652421.png?width=8000&height=8000&resize=contain"
                    alt="TaskLynk Logo"
                    width={128}
                    height={32}
                    className="dark:brightness-110 dark:contrast-125"
                    style={{ width: 'auto', height: '32px' }}
                  />
                </div>
              )}
              <h2 className="font-bold text-base text-sidebar-foreground truncate">
                {userName}
              </h2>
              <p className="text-xs text-sidebar-foreground/60 capitalize truncate">
                {userRole}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 rounded-md hover:bg-sidebar-accent flex-shrink-0"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isExpanded = expandedItems.includes(item.title);
              
              return (
                <li key={item.href}>
                  {hasSubmenu ? (
                    <div>
                      <button
                        onClick={() => toggleExpanded(item.title)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-sm text-left">{item.title}</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform",
                              isExpanded && "rotate-180"
                            )} />
                          </>
                        )}
                      </button>
                      
                      {/* Submenu */}
                      {!collapsed && isExpanded && (
                        <ul className="ml-4 mt-1 space-y-1 border-l-2 border-sidebar-border/50 pl-2">
                          {item.submenu.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = pathname === subItem.href || pathname.includes(subItem.href);
                            
                            return (
                              <li key={subItem.href}>
                                <Link
                                  href={subItem.href}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                                    isSubActive
                                      ? "bg-sidebar-primary/80 text-sidebar-primary-foreground font-medium"
                                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                  )}
                                >
                                  <SubIcon className="w-4 h-4 flex-shrink-0" />
                                  <span>{subItem.title}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-sm">{item.title}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className={cn(
                              "px-2 py-0.5 text-xs rounded-full font-medium",
                              isActive 
                                ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                                : "bg-sidebar-primary/10 text-sidebar-primary"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}