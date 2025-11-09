"use client";

import { Suspense } from "react";
import { FreelancerJobsContent } from "./client-content";

export default function FreelancerJobsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <FreelancerJobsContent />
    </Suspense>
  );
}