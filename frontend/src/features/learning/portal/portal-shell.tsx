"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  GraduationCap,
  Heart,
  House,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { PortalBrand } from "@/components/layout/portal-brand";
import { UserMenu } from "@/components/layout/user-menu";
import { learningNavigationGroups as navGroups } from "@/features/learning/learning-navigation";
import { viewTitles, type PortalView } from "@/features/learning/portal/portal-shared";
import { StudentAnnouncementBell } from "@/features/notification/student-announcement-bell";
import { cn } from "@/lib/cn";

type PortalShellProps = {
  view: PortalView;
  isInstructor: boolean;
  instructorCoursesCount: number;
  enrollmentsCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  mobileNavOpen: boolean;
  onMobileNavOpenChange: (open: boolean) => void;
  sidebarCollapsed: boolean;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
  children: ReactNode;
};

export function PortalShell({
  view,
  isInstructor,
  instructorCoursesCount,
  enrollmentsCount,
  search,
  onSearchChange,
  mobileNavOpen,
  onMobileNavOpenChange,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  children,
}: PortalShellProps) {
  return (
    <div className="learning-app min-h-screen bg-[#f8fafc] text-ink lg:flex">
      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => onMobileNavOpenChange(false)}
          className="fixed inset-0 z-40 bg-[#101a2c]/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        id="learning-sidebar"
        className={cn(
          "learning-sidebar fixed inset-y-0 left-0 z-50 flex w-[261px] shrink-0 flex-col border-r border-slate-200/90 bg-white text-slate-800 shadow-[1px_0_3px_rgba(0,0,0,0.02)] transition-[width,transform] duration-300 ease-in-out motion-reduce:transition-none lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[88px]" : "lg:w-[261px]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Mobile Header in Drawer */}
        <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-100 px-4 lg:hidden">
          <PortalBrand
            roleLabel={isInstructor ? "Giảng viên" : "Học viên"}
            onNavigate={() => onMobileNavOpenChange(false)}
          />
          <button
            type="button"
            onClick={() => onMobileNavOpenChange(false)}
            aria-label="Đóng menu"
            className="focus-ring rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop Header in Sidebar */}
        <div
          className={cn(
            "hidden shrink-0 border-b border-slate-100 transition-[height,padding] duration-300 ease-in-out motion-reduce:transition-none lg:flex",
            sidebarCollapsed
              ? "h-[138px] flex-col items-center justify-start gap-3 px-2 py-3"
              : "h-[83px] items-center justify-between px-5",
          )}
        >
          {sidebarCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => onSidebarCollapsedChange(false)}
                aria-label="Mở rộng thanh bên"
                aria-expanded={false}
                aria-controls="learning-sidebar"
                title="Mở rộng thanh bên"
                className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <Menu className="h-[18px] w-[18px] stroke-[1.8]" aria-hidden="true" />
              </button>
              <Link
                href="/"
                aria-label="EduAlto, về trang chủ"
                className="focus-ring rounded-md p-1"
              >
                <Image
                  src="/images/about/source/logo.png"
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                  priority
                />
              </Link>
            </>
          ) : (
            <>
              <PortalBrand roleLabel={isInstructor ? "Giảng viên" : "Học viên"} />
              <button
                type="button"
                onClick={() => onSidebarCollapsedChange(true)}
                aria-label="Thu gọn thanh bên"
                aria-expanded={true}
                aria-controls="learning-sidebar"
                title="Thu gọn thanh bên"
                className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M20 5v14" />
                  <path d="M17 12H5" />
                  <path d="m12 5-7 7 7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Navigation Items (Scrollable area) */}
        <nav
          aria-label="Điều hướng học tập"
          className={cn(
            "flex-1 overflow-y-auto space-y-5 px-3 py-4 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300",
            sidebarCollapsed && "lg:space-y-1 lg:px-0",
          )}
        >
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p
                className={cn(
                  "px-3 pb-1 text-[10px] font-bold tracking-[.12em] text-slate-400 uppercase",
                  sidebarCollapsed && "lg:hidden",
                )}
              >
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.links.map((item) => {
                  const Icon = item.icon;
                  const selected =
                    item.view === view || (view === "messages" && item.view === "discussion");
                  const count =
                    item.view === "courses"
                      ? isInstructor
                        ? instructorCoursesCount
                        : enrollmentsCount
                      : undefined;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => onMobileNavOpenChange(false)}
                        aria-current={selected ? "page" : undefined}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={cn(
                          "group relative focus-ring flex h-9.5 items-center gap-2.5 rounded-xl px-3 text-xs transition-all active:scale-[0.98]",
                          sidebarCollapsed && "lg:justify-center lg:px-0",
                          sidebarCollapsed
                            ? selected
                              ? "bg-transparent font-semibold text-primary shadow-none hover:bg-slate-100/70"
                              : "text-slate-600 hover:bg-slate-100/70 hover:text-heading"
                            : selected
                              ? "bg-emerald-50/90 font-semibold text-emerald-800 border border-emerald-200/80 shadow-xs shadow-emerald-950/5"
                              : "font-medium text-slate-600 hover:bg-slate-100/70 hover:text-heading",
                        )}
                      >
                        {selected && sidebarCollapsed ? (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-primary"
                          />
                        ) : null}
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors stroke-[1.8]",
                            selected
                              ? "text-primary stroke-[2]"
                              : "text-slate-400 group-hover:text-slate-700",
                          )}
                        />
                        <span className={cn("truncate", sidebarCollapsed && "lg:hidden")}>
                          {item.label}
                        </span>
                        {count !== undefined && count > 0 && (
                          <span
                            className={cn(
                              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums transition-colors",
                              sidebarCollapsed && "lg:hidden",
                              selected
                                ? "bg-emerald-100/90 text-emerald-800 border border-emerald-200/70"
                                : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-700",
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Instructor Quick Hub mini card */}
          {isInstructor && (
            <div
              className={cn(
                "mx-0.5 mt-2 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 p-3 shadow-2xs",
                sidebarCollapsed && "lg:hidden",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Giảng viên Hub
                </span>
                <span className="rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200/60 tabular-nums">
                  {instructorCoursesCount} khóa
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted leading-snug">
                Quản lý khóa học & giáo trình
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <Link
                  href="/instructor"
                  className="focus-ring flex-1 inline-flex h-7.5 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-[11px] font-semibold text-white shadow-xs shadow-primary/20 hover:bg-primary-dark transition active:scale-[0.98]"
                >
                  <LayoutDashboard className="h-3 w-3" />
                  <span>Bảng điều khiển</span>
                </Link>
                <Link
                  href="/instructor/courses/overview"
                  title="Tạo khóa học mới"
                  className="focus-ring inline-flex h-7.5 w-7.5 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:border-emerald-300 hover:text-primary shadow-2xs transition active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div
          className={cn(
            "mt-auto space-y-1 border-t border-slate-100 py-3",
            sidebarCollapsed ? "px-3 lg:px-2" : "px-3",
          )}
        >
          <Link
            href="/"
            onClick={() => onMobileNavOpenChange(false)}
            title={sidebarCollapsed ? "Về trang chủ" : undefined}
            className={cn(
              "focus-ring flex h-9 items-center gap-2.5 rounded-xl px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-heading active:scale-[0.98]",
              sidebarCollapsed && "lg:justify-center lg:px-0",
            )}
          >
            <House className="h-4 w-4 stroke-[1.8]" />
            <span className={sidebarCollapsed ? "lg:hidden" : undefined}>Về trang chủ</span>
          </Link>
          <Link
            href="/profile"
            onClick={() => onMobileNavOpenChange(false)}
            title={sidebarCollapsed ? "Cài đặt tài khoản" : undefined}
            className={cn(
              "focus-ring flex h-9 items-center gap-2.5 rounded-xl px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-heading active:scale-[0.98]",
              sidebarCollapsed && "lg:justify-center lg:px-0",
            )}
          >
            <Settings className="h-4 w-4 stroke-[1.8]" />
            <span className={sidebarCollapsed ? "lg:hidden" : undefined}>Cài đặt tài khoản</span>
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
              onClick={() => onMobileNavOpenChange(true)}
              className="focus-ring rounded-md p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Mở menu học tập"
            >
              <Menu className="h-5 w-5" />
            </button>
            <label className="hidden h-11 w-[367px] items-center gap-2 rounded-lg border border-[#b7e4d7] bg-white px-3 sm:flex">
              <Search className="h-4 w-4 text-[#94a39e]" />
              <span className="sr-only">Tìm kiếm</span>
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-xs outline-none placeholder:text-[#98a39e]"
                placeholder="Tìm kiếm khóa học..."
              />
            </label>
            <span className="text-sm font-bold text-slate-800 lg:hidden">{viewTitles[view]}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/learning/favorites"
              aria-label="Khóa học yêu thích"
              title="Khóa học yêu thích"
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
            >
              <Heart className="h-[21px] w-[21px] stroke-[1.8]" aria-hidden="true" />
            </Link>
            <StudentAnnouncementBell />
            {isInstructor ? (
              <Link
                href="/instructor"
                className="focus-ring hidden items-center gap-1.5 rounded-lg border border-[#b7e4d7] bg-[#f0fbf7] px-3 py-2 text-xs font-semibold text-[#079367] transition hover:bg-[#dff5ec] sm:inline-flex"
              >
                <GraduationCap className="h-4 w-4" />
                Khu vực Giảng viên
              </Link>
            ) : null}
            <UserMenu showNameTrigger />
          </div>
        </header>

        <main className="learning-main mx-auto min-h-[calc(100vh-83px)] w-full max-w-[1440px] px-4 py-6 md:px-7 md:py-8 flex-1">
          <div
            className={cn(
              "mb-5 flex items-center justify-between gap-4",
              (view === "overview" ||
                view === "calendar" ||
                view === "messages" ||
                view === "courses") &&
                "sr-only",
            )}
          >
            <div>
              <h1 className="text-xl font-bold tracking-tight text-heading md:text-2xl">
                {view === "assignments" ? "Bài tập" : viewTitles[view]}
              </h1>
              {view === "assignments" && (
                <p className="mt-1 text-sm text-muted">
                  Xem và quản lý bài tập trong khóa học của bạn
                </p>
              )}
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
