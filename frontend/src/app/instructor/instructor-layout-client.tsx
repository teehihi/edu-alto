"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";
import { useAuthSession } from "@/lib/auth-session";

export function InstructorLayoutClient({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;

    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div
        role="status"
        aria-label="Đang kiểm tra phiên đăng nhập"
        aria-busy="true"
        className="min-h-screen bg-slate-50 lg:flex"
      >
        <div aria-hidden="true" className="hidden w-[261px] shrink-0 bg-[#101a2c] p-5 lg:block">
          <Skeleton className="h-12 rounded-lg bg-slate-700" />
          <div className="mt-10 space-y-4">
            <Skeleton className="h-4 w-32 rounded bg-slate-700" />
            <Skeleton className="h-11 rounded-lg bg-slate-700" />
            <Skeleton className="h-11 rounded-lg bg-slate-700" />
            <Skeleton className="h-11 rounded-lg bg-slate-700" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div
            aria-hidden="true"
            className="flex h-[58px] items-center border-b border-slate-200 bg-white px-5 lg:h-[83px]"
          >
            <Skeleton className="h-10 w-72 max-w-full rounded-lg" />
          </div>
          <main aria-hidden="true" className="space-y-5 p-5 lg:p-6">
            <Skeleton className="h-8 w-64 max-w-full rounded-md" />
            <Skeleton className="h-36 rounded-lg bg-white" />
            <Skeleton className="h-64 rounded-lg bg-white" />
          </main>
        </div>
      </div>
    );
  }

  return <InstructorWorkspaceShell>{children}</InstructorWorkspaceShell>;
}
