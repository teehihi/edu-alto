"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  BookOpen,
  DollarSign,
  Home,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PortalBrand } from "@/components/layout/portal-brand";
import { UserMenu } from "@/components/layout/user-menu";
import { useAuth } from "@/features/auth/auth-client";
import { cn } from "@/lib/cn";
import type { AuthUser } from "@/lib/auth";

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

interface InstructorWorkspaceContextValue {
  isInsideWorkspace: boolean;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
}

const InstructorWorkspaceContext = createContext<InstructorWorkspaceContextValue | null>(null);

function InstructorAccountModal({ user, onClose }: { user: AuthUser | null; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements.item(0);
      const lastElement = focusableElements.item(focusableElements.length - 1);

      if (focusableElements.length === 0) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const roleLabel = user?.roles.some((role) => role === "ADMIN" || role === "ROLE_ADMIN")
    ? "Quản trị viên"
    : user?.roles.some((role) => role === "INSTRUCTOR" || role === "ROLE_INSTRUCTOR")
      ? "Giảng viên"
      : "Học viên";

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm animate-modal-backdrop motion-reduce:animate-none"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="instructor-account-modal-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-modal-content motion-reduce:animate-none"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id="instructor-account-modal-title" className="text-lg font-semibold text-heading">
              Tài khoản
            </h2>
            <p className="mt-1 text-sm text-muted">Thông tin tài khoản EduAlto của bạn.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng thông tin tài khoản"
            className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
          <UserAvatar
            name={user?.fullName}
            email={user?.email}
            avatarUrl={user?.avatarUrl}
            size="lg"
            className="h-14 w-14"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-heading">{user?.fullName || "Tài khoản"}</p>
            <p className="mt-0.5 truncate text-sm text-muted">{user?.email || ""}</p>
            <span className="mt-2 inline-flex rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
              {roleLabel}
            </span>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Đóng
          </button>
          <Link
            href="/profile"
            onClick={onClose}
            className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Cài đặt tài khoản
          </Link>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

export function useInstructorWorkspaceSidebar() {
  return useContext(InstructorWorkspaceContext);
}

export function InstructorWorkspaceSidebar({
  activeSection,
  sidebarCollapsed,
  setSidebarCollapsed,
  controlsId,
  onNavigate,
  showAccountAvatar = false,
}: {
  activeSection: InstructorWorkspaceSection;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  controlsId: string;
  onNavigate?: () => void;
  showAccountAvatar?: boolean;
}) {
  const { user } = useAuth();
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const closeAccountModal = useCallback(() => {
    setAccountModalOpen(false);
    window.requestAnimationFrame(() => accountTriggerRef.current?.focus());
  }, []);

  return (
    <>
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
            <PortalBrand roleLabel="Giảng viên" tone="dark" />
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

      <nav
        aria-label="Điều hướng giảng viên"
        className={cn(
          "flex-1 space-y-1 overflow-y-auto px-3 py-4",
          sidebarCollapsed ? "lg:px-0" : "lg:px-3",
        )}
      >
        <p
          className={cn(
            "mb-2 px-3 text-[11px] font-bold tracking-[.12em] text-slate-400 uppercase",
            sidebarCollapsed && "lg:hidden",
          )}
        >
          QUẢN LÝ GIẢNG DẠY
        </p>
        {navigation.map(({ label, icon: Icon, href, section }) => {
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
              <span className={sidebarCollapsed ? "lg:hidden" : undefined}>{label}</span>
            </Link>
          );
        })}
      </nav>

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
        {showAccountAvatar ? (
          <button
            ref={accountTriggerRef}
            type="button"
            onClick={() => setAccountModalOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={accountModalOpen}
            aria-label={`Thông tin tài khoản: ${user?.fullName || "Tài khoản"}`}
            title="Thông tin tài khoản"
            className={cn(
              "focus-ring flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-[0.98]",
              sidebarCollapsed && "lg:justify-center lg:px-0",
            )}
          >
            <UserAvatar
              name={user?.fullName}
              email={user?.email}
              avatarUrl={user?.avatarUrl}
              size="sm"
              className="h-9 w-9 shrink-0"
            />
            <span className={cn("min-w-0 truncate", sidebarCollapsed && "lg:hidden")}>
              {user?.fullName || "Tài khoản"}
            </span>
          </button>
        ) : (
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
        )}
      </div>
      {showAccountAvatar && accountModalOpen ? (
        <InstructorAccountModal user={user} onClose={closeAccountModal} />
      ) : null}
    </>
  );
}

export function InstructorWorkspaceShell({
  activeSection: propActiveSection,
  children,
}: {
  activeSection?: InstructorWorkspaceSection;
  children: ReactNode;
}) {
  const workspaceContext = useInstructorWorkspaceSidebar();
  const isInsideWorkspace = workspaceContext?.isInsideWorkspace ?? false;
  const pathname = usePathname();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    <InstructorWorkspaceContext.Provider
      value={{ isInsideWorkspace: true, sidebarCollapsed, setSidebarCollapsed }}
    >
      <div className="min-h-screen bg-[#f8fafc] text-ink lg:flex">
        {/* Mobile Backdrop */}
        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-[#101a2c]/40 backdrop-blur-xs lg:hidden animate-backdrop-fade motion-reduce:animate-none"
          />
        )}

        {/* Sidebar */}
        <aside
          id="instructor-sidebar"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[261px] flex-col border-r border-slate-800 bg-[#101a2c] text-white shadow-[1px_0_3px_rgba(0,0,0,0.12)] transition-[width,transform] duration-300 ease-in-out motion-reduce:transition-none lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
            sidebarCollapsed ? "lg:w-[88px]" : "lg:w-[261px]",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          {/* Mobile Header in Drawer */}
          <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-800 px-4 lg:hidden">
            <PortalBrand
              roleLabel="Giảng viên"
              tone="dark"
              onNavigate={() => setMobileNavOpen(false)}
            />
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Đóng menu"
              className="focus-ring rounded-md p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="hidden min-h-0 flex-1 flex-col lg:flex">
            <InstructorWorkspaceSidebar
              activeSection={activeSection}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
              controlsId="instructor-sidebar"
              onNavigate={() => setMobileNavOpen(false)}
            />
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
              <UserMenu showNameTrigger />
            </div>
          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </InstructorWorkspaceContext.Provider>
  );
}
