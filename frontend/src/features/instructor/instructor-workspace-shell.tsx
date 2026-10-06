"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  BookOpen,
  DollarSign,
  GraduationCap,
  Home,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Search,
  Settings,
  X,
} from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/cn";

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

const InstructorWorkspaceContext = createContext(false);

export function InstructorWorkspaceShell({
  activeSection: propActiveSection,
  children,
}: {
  activeSection?: InstructorWorkspaceSection;
  children: ReactNode;
}) {
  const isInsideWorkspace = useContext(InstructorWorkspaceContext);
  const pathname = usePathname();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (isInsideWorkspace) {
    return <>{children}</>;
  }

  const activeSection =
    propActiveSection ??
    (pathname.startsWith("/instructor/courses")
      ? "courses"
      : pathname.startsWith("/instructor/community")
        ? "community"
        : pathname.startsWith("/instructor/revenue")
          ? "revenue"
          : "dashboard");

  return (
    <InstructorWorkspaceContext.Provider value={true}>
      <div className="min-h-screen bg-[#f8fafc] text-ink lg:flex">
        {/* Mobile Backdrop */}
        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-[#101a2c]/40 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[261px] flex-col border-r border-slate-200/90 bg-white text-slate-800 shadow-[1px_0_3px_rgba(0,0,0,0.02)] transition-transform duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          {/* Mobile Header in Drawer */}
          <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-100 px-4 lg:hidden">
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="focus-ring flex items-center gap-2.5 rounded-lg transition active:scale-[0.98]"
              aria-label="EduAlto, về trang chủ"
            >
              <Image
                src="/images/logo-w-text.png"
                alt="EduAlto"
                width={128}
                height={42}
                className="h-8 w-auto object-contain"
                priority
              />
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/80">
                Giảng viên
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Đóng menu"
              className="focus-ring rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop Header in Sidebar */}
          <div className="hidden h-[83px] shrink-0 items-center justify-between border-b border-slate-100 px-5 lg:flex">
            <Link
              href="/"
              className="focus-ring flex items-center gap-2.5 rounded-lg transition active:scale-[0.98]"
              aria-label="EduAlto, về trang chủ"
            >
              <Image
                src="/images/logo-w-text.png"
                alt="EduAlto"
                width={130}
                height={44}
                className="h-8 w-auto object-contain"
                priority
              />
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/80">
                Giảng viên
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav
            aria-label="Điều hướng giảng viên"
            className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
          >
            <p className="mb-2 px-3 text-[11px] font-bold tracking-[.12em] text-slate-400 uppercase">
              QUẢN LÝ GIẢNG DẠY
            </p>
            {navigation.map(({ label, icon: Icon, href, section }) => {
              const active = activeSection === section;
              return (
                <Link
                  key={section}
                  href={href}
                  onClick={() => setMobileNavOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition active:scale-[0.98]",
                    active
                      ? "bg-primary font-semibold text-white shadow-xs shadow-primary/25"
                      : "text-slate-600 hover:bg-[#edf7f3] hover:text-emerald-700 active:bg-[#e1f3eb]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.8]" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="space-y-1 border-t border-slate-100 p-3">
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="focus-ring flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-[#edf7f3] hover:text-emerald-700 active:scale-[0.98]"
            >
              <Home className="h-4 w-4 stroke-[1.8]" />
              Về trang chủ
            </Link>
            <Link
              href="/learning"
              onClick={() => setMobileNavOpen(false)}
              className="focus-ring flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-[#edf7f3] hover:text-emerald-700 active:scale-[0.98]"
            >
              <GraduationCap className="h-4 w-4 stroke-[1.8]" />
              Khu vực học tập
            </Link>
            <Link
              href="/profile"
              onClick={() => setMobileNavOpen(false)}
              className="focus-ring flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-[#edf7f3] hover:text-emerald-700 active:scale-[0.98]"
            >
              <Settings className="h-4 w-4 stroke-[1.8]" />
              Cài đặt tài khoản
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Synchronized Topbar */}
          <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 lg:h-[83px]">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="focus-ring rounded-md p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
                aria-label="Mở menu giảng viên"
              >
                <Menu className="h-5 w-5" />
              </button>
              <label className="hidden h-11 w-[367px] items-center gap-2 rounded-lg border border-[#b7e4d7] bg-white px-3 sm:flex">
                <Search className="h-4 w-4 text-[#94a39e]" />
                <span className="sr-only">Tìm kiếm</span>
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent text-xs outline-none placeholder:text-[#98a39e]"
                  placeholder="Tìm kiếm khóa học, học viên..."
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/learning"
                className="focus-ring hidden items-center gap-1.5 rounded-lg border border-[#b7e4d7] bg-[#f0fbf7] px-3 py-2 text-xs font-semibold text-[#079367] transition hover:bg-[#dff5ec] sm:inline-flex"
              >
                <GraduationCap className="h-4 w-4" />
                Khu vực học tập
              </Link>
              <UserMenu showNameTrigger />
            </div>
          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </InstructorWorkspaceContext.Provider>
  );
}
