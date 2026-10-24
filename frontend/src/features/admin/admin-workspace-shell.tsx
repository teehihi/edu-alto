"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  createContext,
  useContext,
  useState,
} from "react";
import Image from "next/image";
import {
  BarChart3,
  BookOpen,
  CreditCard,
  ExternalLink,
  Home,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { PortalBrand } from "@/components/layout/portal-brand";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-client";
import { cn } from "@/lib/cn";

export type AdminSection = "dashboard" | "payments" | "courses" | "users" | "roles" | "analytics";

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
    label: "Vai trò & Phân quyền",
    icon: ShieldCheck,
    href: "/admin/roles",
    section: "roles",
  },
  {
    label: "Báo cáo & Thống kê",
    icon: BarChart3,
    href: "/admin/analytics",
    section: "analytics",
  },
];

interface AdminWorkspaceContextValue {
  activeSection: AdminSection;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
}

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(null);

export function useAdminWorkspace() {
  return useContext(AdminWorkspaceContext);
}

function AdminWorkspaceSidebar({
  activeSection,
  sidebarCollapsed,
  setSidebarCollapsed,
  controlsId,
  onNavigate,
}: {
  activeSection: AdminSection;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  controlsId: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {/* Brand Header */}
      <div
        className={cn(
          "shrink-0 border-b border-slate-800 transition-[height,padding] duration-300 ease-in-out motion-reduce:transition-none lg:flex",
          sidebarCollapsed
            ? "flex h-[138px] flex-col items-center justify-start gap-3 px-2 py-3"
            : "h-[83px] items-center justify-between px-5",
        )}
      >
        {sidebarCollapsed ? (
          <>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Mở rộng thanh bên"
              aria-expanded={false}
              aria-controls={controlsId}
              title="Mở rộng thanh bên"
              className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <Menu className="h-[18px] w-[18px] stroke-[1.8]" aria-hidden="true" />
            </button>
            <Link href="/" aria-label="EduAlto, về trang chủ" className="focus-ring rounded-md p-1">
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
            <PortalBrand roleLabel="Quản trị viên" tone="dark" onNavigate={onNavigate} />
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Thu gọn thanh bên"
              aria-expanded={true}
              aria-controls={controlsId}
              title="Thu gọn thanh bên"
              className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-200 transition hover:bg-white/10 hover:text-white"
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

      {/* Navigation Menu */}
      <nav
        aria-label="Điều hướng quản trị viên"
        className={cn(
          "flex-1 space-y-1 overflow-y-auto px-3 py-4 lg:overflow-y-visible",
          sidebarCollapsed ? "lg:px-0" : "lg:px-3",
        )}
      >
        <p
          className={cn(
            "mb-2 px-3 text-[11px] font-bold tracking-[.12em] text-slate-400 uppercase",
            sidebarCollapsed && "lg:hidden",
          )}
        >
          QUẢN TRỊ HỆ THỐNG
        </p>
        {navigationItems.map(({ label, icon: Icon, href, section, badge }) => {
          const active = activeSection === section;
          return (
            <Link
              key={section}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={sidebarCollapsed ? label : undefined}
              className={cn(
                "focus-ring relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition active:scale-[0.98]",
                sidebarCollapsed && "lg:justify-center lg:px-0",
                sidebarCollapsed
                  ? active
                    ? "bg-transparent font-semibold text-primary shadow-none hover:bg-white/5"
                    : "text-slate-300 hover:bg-white/5 hover:text-white active:bg-white/10"
                  : active
                    ? "bg-primary font-semibold text-white shadow-xs shadow-primary/25"
                    : "text-slate-300 hover:bg-white/10 hover:text-white active:bg-white/15",
              )}
            >
              {active && sidebarCollapsed ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-primary"
                />
              ) : null}
              <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.8]" aria-hidden="true" />
              <span className={cn("truncate", sidebarCollapsed && "lg:hidden")}>{label}</span>
              {badge && !sidebarCollapsed && (
                <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pinned Bottom Navigation (Fixed at bottom, matching instructor layout) */}
      <div
        className={cn(
          "space-y-1 border-t border-slate-800 py-3",
          sidebarCollapsed ? "px-3 lg:px-2" : "px-3",
        )}
      >
        <Link
          href="/"
          onClick={onNavigate}
          title={sidebarCollapsed ? "Về trang chủ" : undefined}
          className={cn(
            "focus-ring flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-[0.98]",
            sidebarCollapsed && "lg:justify-center lg:px-0",
          )}
        >
          <Home className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
          <span className={sidebarCollapsed ? "lg:hidden" : undefined}>Về trang chủ</span>
        </Link>
        <Link
          href="/profile"
          onClick={onNavigate}
          title={sidebarCollapsed ? "Cài đặt tài khoản" : undefined}
          className={cn(
            "focus-ring flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-[0.98]",
            sidebarCollapsed && "lg:justify-center lg:px-0",
          )}
        >
          <Settings className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
          <span className={sidebarCollapsed ? "lg:hidden" : undefined}>Cài đặt tài khoản</span>
        </Link>
      </div>
    </>
  );
}

function AdminAccessDeniedState({
  onGoHome,
  onSwitchAccount,
}: {
  onGoHome: () => void;
  onSwitchAccount: () => void;
}) {
  return (
    <div
      className="relative flex min-h-dvh w-full items-center justify-center overflow-y-auto px-4 py-12 sm:px-6"
      style={{
        background:
          "radial-gradient(ellipse 800px 600px at 50% 45%, #E6F7F2 0%, #F5FBF9 45%, #FFFFFF 100%)",
      }}
    >
      <main
        role="alert"
        aria-labelledby="admin-access-denied-title"
        aria-describedby="admin-access-denied-desc"
        className="relative mx-auto flex w-full max-w-[460px] flex-col items-center text-center"
      >
        {/* Animated Mascot Illustration */}
        <div className="mb-5 flex justify-center sm:mb-6">
          <Image
            src="/images/mascot/9-animated.webp"
            alt="Mascot EduAlto"
            width={260}
            height={260}
            unoptimized
            className="h-52 w-52 object-contain select-none transition-transform duration-300 hover:scale-105 sm:h-64 sm:w-64"
            priority
          />
        </div>

        {/* Typography */}
        <h1
          id="admin-access-denied-title"
          className="text-2xl font-bold tracking-tight text-heading sm:text-[28px]"
        >
          Không có quyền quản trị
        </h1>
        <p
          id="admin-access-denied-desc"
          className="mt-3 text-sm leading-relaxed text-muted sm:text-base"
        >
          Tài khoản hiện tại của bạn không thuộc nhóm Quản trị viên (Admin) của EduAlto. Vui lòng
          quay lại trang chủ hoặc đăng nhập bằng tài khoản có thẩm quyền.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex w-full flex-col gap-3">
          <Button
            type="button"
            className="focus-ring h-12 w-full rounded-xl bg-primary text-base font-semibold text-white shadow-xs transition duration-200 hover:bg-[#159e75] active:scale-[0.99]"
            onClick={onGoHome}
          >
            Về trang chủ EduAlto
          </Button>
          <Button
            type="button"
            variant="outline"
            className="focus-ring h-12 w-full rounded-xl border-slate-200 bg-white text-base font-semibold text-slate-700 transition duration-200 hover:bg-slate-50 active:scale-[0.99]"
            onClick={onSwitchAccount}
          >
            Đăng nhập tài khoản khác
          </Button>
        </div>
      </main>
    </div>
  );
}

export function AdminWorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      <AdminAccessDeniedState
        onGoHome={() => router.push("/")}
        onSwitchAccount={() => {
          void logout();
          router.push("/login?next=/admin/dashboard");
        }}
      />
    );
  }

  return (
    <AdminWorkspaceContext.Provider
      value={{ activeSection, sidebarCollapsed, setSidebarCollapsed }}
    >
      <div className="min-h-screen bg-[#f8fafc] text-ink lg:flex">
        {/* Mobile Backdrop */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Drawer */}
        <aside
          id="admin-workspace-mobile-drawer"
          aria-label="Thanh bên quản trị viên di động"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[261px] flex-col border-r border-slate-800 bg-[#101A2C] text-slate-100 shadow-2xl transition-transform duration-300 ease-in-out motion-reduce:transition-none lg:hidden",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-[58px] items-center justify-between border-b border-slate-800 px-4">
            <PortalBrand
              roleLabel="Quản trị viên"
              tone="dark"
              onNavigate={() => setMobileNavOpen(false)}
            />
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Đóng thanh bên"
              className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <AdminWorkspaceSidebar
            activeSection={activeSection}
            sidebarCollapsed={false}
            setSidebarCollapsed={() => {}}
            controlsId="admin-workspace-mobile-drawer"
            onNavigate={() => setMobileNavOpen(false)}
          />
        </aside>

        {/* Desktop Fixed Sidebar */}
        <aside
          id="admin-workspace-sidebar"
          aria-label="Thanh bên quản lý quản trị viên"
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-800 bg-[#101A2C] text-slate-100 transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:flex",
            sidebarCollapsed ? "w-[88px]" : "w-[261px]",
          )}
        >
          <AdminWorkspaceSidebar
            activeSection={activeSection}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            controlsId="admin-workspace-sidebar"
          />
        </aside>

        {/* Main Content Area */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-[padding-left] duration-300 ease-in-out motion-reduce:transition-none",
            sidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[261px]",
          )}
        >
          {/* Synchronized Topbar Header */}
          <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 lg:h-[83px]">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="focus-ring -ml-1 inline-flex size-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 lg:hidden"
                aria-label="Mở menu quản trị"
                aria-expanded={mobileNavOpen}
                aria-controls="admin-workspace-mobile-drawer"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
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
                href="/instructor"
                className="focus-ring hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex"
              >
                <span>Cổng giảng viên</span>
                <ExternalLink className="h-3 w-3 text-muted" />
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <UserMenu showNameTrigger={true} />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </AdminWorkspaceContext.Provider>
  );
}
