"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, DollarSign, LayoutDashboard, MessageSquare, Settings } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/features/auth/auth-client";

type InstructorWorkspaceSection = "dashboard" | "courses" | "community" | "revenue";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/instructor", section: "dashboard" },
  {
    label: "Khóa học",
    icon: BookOpen,
    href: "/instructor/courses/overview",
    section: "courses",
  },
  {
    label: "Cộng đồng",
    icon: MessageSquare,
    href: "/instructor/community",
    section: "community",
  },
  {
    label: "Doanh thu và Lợi nhuận",
    icon: DollarSign,
    href: "/instructor/revenue",
    section: "revenue",
  },
] as const;

export function InstructorWorkspaceShell({
  activeSection,
  children,
}: {
  activeSection: InstructorWorkspaceSection;
  children: ReactNode;
}) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-ink lg:flex">
      <aside className="flex shrink-0 flex-col bg-[#101a2c] text-white lg:sticky lg:top-0 lg:h-screen lg:w-[261px]">
        <div className="flex h-[71px] shrink-0 items-center justify-between border-b border-white/10 px-3">
          <Link href="/" className="focus-ring rounded-sm" aria-label="EduAlto, về trang chủ">
            <Image
              src="/images/edualto-wordmark.png"
              alt="EduAlto"
              width={73}
              height={16}
              priority
            />
          </Link>
          <span className="sr-only">Khu vực giảng viên</span>
        </div>
        <nav
          aria-label="Điều hướng giảng viên"
          className="flex gap-1 overflow-x-auto p-2 lg:flex-1 lg:flex-col lg:gap-2 lg:p-3 lg:pt-2"
        >
          {navigation.map(({ label, icon: Icon, href, section }) => {
            const active = activeSection === section;
            return (
              <Link
                key={section}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`focus-ring flex min-h-11 shrink-0 items-center gap-3 border-l-2 px-3 text-sm transition lg:min-h-[60px] ${
                  active
                    ? "border-primary bg-white/5 font-semibold text-primary"
                    : "border-transparent text-slate-200 hover:bg-white/5 hover:text-white active:bg-white/10"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
          <span className="hidden min-h-11 items-center gap-3 rounded-md px-3 text-sm text-slate-500 lg:flex">
            <Settings className="h-[18px] w-[18px]" aria-hidden="true" /> Cài đặt
          </span>
        </nav>
        <div className="hidden items-center gap-3 border-t border-white/10 px-3 py-4 lg:flex">
          <UserAvatar name={user?.fullName} avatarUrl={user?.avatarUrl} size="sm" />
          <span className="truncate text-sm text-slate-200">
            Chào, {user?.fullName || "Giảng viên"}
          </span>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
