"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, createContext, useContext, useState } from "react";
import Image from "next/image";
import {
  BarChart3,
  BookOpen,
  CreditCard,
  ExternalLink,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-client";
import { cn } from "@/lib/cn";

export type AdminSection = "dashboard" | "payments" | "courses" | "users" | "analytics";

const navigationItems: {
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
  section: AdminSection;
  badge?: string;
}[] = [
  {
    label: "Tổng quan",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
    section: "dashboard",
  },
  {
    label: "Đối soát thanh toán",
    icon: CreditCard,
    href: "/admin/payments",
    section: "payments",
  },
  {
    label: "Quản lý khóa học",
    icon: BookOpen,
    href: "/admin/courses",
    section: "courses",
  },
  {
    label: "Người dùng & Giảng viên",
    icon: Users,
    href: "/admin/users",
    section: "users",
  },
  {
    label: "Báo cáo & Thống kê",
    icon: BarChart3,
    href: "/admin/analytics",
    section: "analytics",
  },
];

const AdminContext = createContext<{
  activeSection: AdminSection;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}>({
  activeSection: "dashboard",
  sidebarOpen: false,
  setSidebarOpen: () => {},
});

export function useAdminWorkspace() {
  return useContext(AdminContext);
}

export function AdminWorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check Admin Role
  const isAdmin = user?.roles?.some((r) => r === "ADMIN" || r === "ROLE_ADMIN");

  // Determine active section
  let activeSection: AdminSection = "dashboard";
  if (pathname.startsWith("/admin/payments")) activeSection = "payments";
  else if (pathname.startsWith("/admin/courses")) activeSection = "courses";
  else if (pathname.startsWith("/admin/users")) activeSection = "users";
  else if (pathname.startsWith("/admin/analytics")) activeSection = "analytics";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted">Đang tải trang quản trị...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-heading">Không có quyền truy cập</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Tài khoản của bạn không có vai trò Quản trị viên (Admin) để truy cập cổng quản trị hệ
            thống EduAlto.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Button
              className="focus-ring w-full bg-primary font-semibold text-white hover:bg-[#159e75]"
              onClick={() => router.push("/")}
            >
              Về trang chủ EduAlto
            </Button>
            <Button
              variant="outline"
              className="focus-ring w-full border-slate-200 text-slate-700 hover:bg-slate-50"
              onClick={() => {
                void logout();
                router.push("/login?next=/admin/dashboard");
              }}
            >
              Đăng nhập tài khoản khác
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ activeSection, sidebarOpen, setSidebarOpen }}>
      <div className="flex min-h-screen bg-[#f8fafc]">
        {/* Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-[#101a2c] text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Logo / Brand */}
          <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <Image
                src="/images/about/source/logo.png"
                alt="EduAlto Logo"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-white">EduAlto</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
                  <ShieldCheck className="h-3 w-3" />
                  Admin Portal
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              aria-label="Đóng menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
            <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Quản trị hệ thống
            </div>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.section;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/25"
                      : "text-slate-300 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-white",
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User & Switcher Footer */}
          <div className="border-t border-slate-800 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-900/60 p-3">
              <UserAvatar
                name={user?.fullName}
                email={user?.email}
                avatarUrl={user?.avatarUrl}
                size="sm"
                className="h-10 w-10 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.fullName || "Quản trị viên"}
                </p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/"
                className="focus-ring flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                title="Quay lại giao diện người dùng"
              >
                <Home className="h-3.5 w-3.5 text-primary" />
                <span>Trang chủ</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  void logout();
                  router.push("/");
                }}
                className="focus-ring flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-950/40 hover:text-rose-200"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Body */}
        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          {/* Topbar Header */}
          <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="focus-ring rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="Mở menu quản trị"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-heading sm:text-xl">
                  {navigationItems.find((item) => item.section === activeSection)?.label ??
                    "Quản trị hệ thống"}
                </h1>
                <p className="hidden text-xs text-muted sm:block">
                  Trung tâm vận hành và kiểm soát dữ liệu nền tảng học tập EduAlto
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/instructor"
                className="focus-ring hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex"
              >
                <span>Cổng giảng viên</span>
                <ExternalLink className="h-3 w-3 text-muted" />
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <Link
                href="/profile"
                className="focus-ring flex items-center gap-2 rounded-full p-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <UserAvatar
                  name={user?.fullName}
                  email={user?.email}
                  avatarUrl={user?.avatarUrl}
                  size="sm"
                  className="h-8 w-8"
                />
                <span className="hidden sm:inline">
                  {user?.fullName?.split(" ").slice(-1)[0] || "Admin"}
                </span>
              </Link>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
