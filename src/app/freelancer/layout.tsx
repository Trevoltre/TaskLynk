"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { FreelancerSidebar } from "@/components/freelancer-sidebar";

export default function FreelancerLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex">
        <FreelancerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}