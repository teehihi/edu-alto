"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/features/auth/auth-client";
import { UserAvatar } from "@/components/ui/user-avatar";

export interface UserMenuProps {
  className?: string;
  align?: "right" | "left";
  dropDirection?: "down" | "up";
  showNameTrigger?: boolean;
  dark?: boolean;
}

export function UserMenu({
  className,
  align = "right",
  dropDirection = "down",
  showNameTrigger = false,
  dark = false,
}: UserMenuProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHoverTimeRef = useRef(0);

  const closeMenu = useCallback(() => {
    if (userMenuLeaveTimerRef.current) {
      clearTimeout(userMenuLeaveTimerRef.current);
      userMenuLeaveTimerRef.current = null;
    }
    setIsUserMenuOpen(false);
  }, []);

  const handlePointerEnter = useCallback((event: React.PointerEvent) => {
    if (!event.pointerType || event.pointerType === "mouse") {
      lastHoverTimeRef.current = Date.now();
      if (userMenuLeaveTimerRef.current) {
        clearTimeout(userMenuLeaveTimerRef.current);
        userMenuLeaveTimerRef.current = null;
      }
      setIsUserMenuOpen(true);
    }
  }, []);

  const handlePointerLeave = useCallback((event: React.PointerEvent) => {
    if (!event.pointerType || event.pointerType === "mouse") {
      if (userMenuLeaveTimerRef.current) {
        clearTimeout(userMenuLeaveTimerRef.current);
      }
      userMenuLeaveTimerRef.current = setTimeout(() => {
        setIsUserMenuOpen(false);
      }, 350);
    }
  }, []);

  const handleToggleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (userMenuLeaveTimerRef.current) {
      clearTimeout(userMenuLeaveTimerRef.current);
      userMenuLeaveTimerRef.current = null;
    }
    const timeSinceHover = Date.now() - lastHoverTimeRef.current;
    if (timeSinceHover < 350) {
      setIsUserMenuOpen(true);
    } else {
      setIsUserMenuOpen((open) => !open);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    closeMenu();
    if (logout) {
      await logout();
    }
    router.push("/login");
    router.refresh();
  }, [closeMenu, logout, router]);

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen, closeMenu]);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsUserMenuOpen(false);
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (userMenuLeaveTimerRef.current) {
        clearTimeout(userMenuLeaveTimerRef.current);
      }
    };
  }, []);

  const isAuthed = isAuthenticated ?? Boolean(user);
  if (!isAuthed || !user) {
    return null;
  }

  const isAdmin = user.roles?.some((r) => r === "ADMIN" || r === "ROLE_ADMIN");
  const isInstructor = user.roles?.some((r) => r === "INSTRUCTOR" || r === "ROLE_INSTRUCTOR");
  const roleLabel = isAdmin ? "Quản trị viên" : isInstructor ? "Giảng viên" : "Học viên";

  return (
    <div
      className={cn("relative inline-flex items-center", className)}
      ref={userMenuRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Trigger Pill: Avatar (Click to Profile) + Toggle Button */}
      <div
        className={cn(
          "flex items-center rounded-full border border-transparent p-1 transition-colors duration-200",
          dark
            ? isUserMenuOpen
              ? "bg-white/10"
              : "hover:bg-white/10"
            : isUserMenuOpen
              ? "bg-primary-soft/80"
              : "hover:bg-primary-soft/60",
        )}
      >
        <Link
          href="/profile"
          onClick={closeMenu}
          aria-label={`Trang cá nhân: ${user.fullName || "Tài khoản"}`}
          title="Xem trang cá nhân"
          className="focus-ring group relative rounded-full"
        >
          <UserAvatar
            name={user.fullName}
            email={user.email}
            avatarUrl={user.avatarUrl}
            size="sm"
            className="h-[38px] w-[38px]"
          />
        </Link>

        {showNameTrigger ? (
          <Link
            href="/profile"
            onClick={closeMenu}
            className={cn(
              "ml-2 hidden max-w-44 truncate text-xs font-semibold sm:inline hover:underline",
              dark ? "text-slate-200" : "text-[#27332f]",
            )}
            title="Xem trang cá nhân"
          >
            {user.fullName || "Tài khoản"}
          </Link>
        ) : null}

        <button
          type="button"
          onClick={handleToggleClick}
          aria-expanded={isUserMenuOpen}
          aria-haspopup="menu"
          aria-label={`Menu người dùng: ${user.fullName || "Tài khoản"}`}
          className={cn(
            "focus-ring ml-0.5 flex h-7 w-6 items-center justify-center rounded-full transition active:scale-95",
            dark ? "text-slate-300 hover:text-white" : "text-slate-500 hover:text-primary",
          )}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-primary transition-transform duration-200",
              isUserMenuOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Popover Dropdown */}
      {isUserMenuOpen && (
        <div
          className={cn(
            "absolute z-50",
            dropDirection === "up" ? "bottom-full pb-2" : "top-full pt-2",
            align === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right",
            showNameTrigger ? "w-72 min-w-full" : "w-64",
          )}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          {/* Invisible hit-area bridge connecting trigger and dropdown */}
          <div
            className={cn(
              "absolute left-0 right-0 h-3",
              dropDirection === "up" ? "-bottom-3" : "-top-3",
            )}
            aria-hidden="true"
          />
          <div
            className="w-full rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-black/5"
            role="menu"
            aria-orientation="vertical"
          >
            {/* User Profile Card */}
            <Link
              href="/profile"
              onClick={closeMenu}
              className="mb-1 flex items-center gap-3 rounded-xl bg-slate-50/80 p-3 transition-colors hover:bg-primary-soft/60 focus-ring"
              title="Xem hồ sơ cá nhân"
            >
              <UserAvatar
                name={user.fullName}
                email={user.email}
                avatarUrl={user.avatarUrl}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-heading">
                  {user.fullName || "Tài khoản"}
                </p>
                <p className="truncate text-[11px] text-muted">{user.email}</p>
                <span
                  className={cn(
                    "mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold",
                    isAdmin
                      ? "border border-purple-200/80 bg-purple-50 text-purple-700"
                      : isInstructor
                        ? "border border-blue-200/80 bg-blue-50 text-blue-700"
                        : "bg-primary-soft text-primary",
                  )}
                >
                  {roleLabel}
                </span>
              </div>
            </Link>

            <div className="my-1 h-px bg-slate-100" />

            {/* Menu Items */}
            <Link
              href="/profile"
              role="menuitem"
              onClick={closeMenu}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                pathname === "/profile"
                  ? "bg-primary-soft font-bold text-primary hover:bg-[#d5f7ec]"
                  : "text-slate-700 hover:bg-primary-soft/60 hover:text-primary active:bg-primary-soft",
              )}
            >
              <UserIcon
                className={cn(
                  "h-4 w-4 transition-colors",
                  pathname === "/profile"
                    ? "text-primary"
                    : "text-slate-400 group-hover:text-primary",
                )}
              />
              <span>Trang cá nhân</span>
            </Link>

            {isAdmin ? (
              <Link
                href="/admin/payments"
                role="menuitem"
                onClick={closeMenu}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  pathname.startsWith("/admin")
                    ? "bg-primary-soft font-bold text-primary hover:bg-[#d5f7ec]"
                    : "text-slate-700 hover:bg-primary-soft/60 hover:text-primary active:bg-primary-soft",
                )}
              >
                <ShieldCheck
                  className={cn(
                    "h-4 w-4 transition-colors",
                    pathname.startsWith("/admin")
                      ? "text-primary"
                      : "text-slate-400 group-hover:text-primary",
                  )}
                />
                <span>Quản trị hệ thống</span>
              </Link>
            ) : null}

            {isInstructor ? (
              <Link
                href="/instructor"
                role="menuitem"
                onClick={closeMenu}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  pathname.startsWith("/instructor")
                    ? "bg-primary-soft font-bold text-primary hover:bg-[#d5f7ec]"
                    : "text-slate-700 hover:bg-primary-soft/60 hover:text-primary active:bg-primary-soft",
                )}
              >
                <LayoutDashboard
                  className={cn(
                    "h-4 w-4 transition-colors",
                    pathname.startsWith("/instructor")
                      ? "text-primary"
                      : "text-slate-400 group-hover:text-primary",
                  )}
                />
                <span>Bảng điều khiển giảng viên</span>
              </Link>
            ) : null}

            <Link
              href="/learning/courses"
              role="menuitem"
              onClick={closeMenu}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                pathname.startsWith("/learning")
                  ? "bg-primary-soft font-bold text-primary hover:bg-[#d5f7ec]"
                  : "text-slate-700 hover:bg-primary-soft/60 hover:text-primary active:bg-primary-soft",
              )}
            >
              <GraduationCap
                className={cn(
                  "h-4 w-4 transition-colors",
                  pathname.startsWith("/learning")
                    ? "text-primary"
                    : "text-slate-400 group-hover:text-primary",
                )}
              />
              <span>Khóa học của tôi</span>
            </Link>

            <Link
              href="/profile"
              role="menuitem"
              onClick={closeMenu}
              className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-primary-soft/60 hover:text-primary active:bg-primary-soft"
            >
              <Settings className="h-4 w-4 text-slate-400 transition-colors group-hover:text-primary" />
              <span>Cài đặt tài khoản</span>
            </Link>

            <div className="my-1 h-px bg-slate-100" />

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4 text-rose-500 transition-transform group-hover:-translate-x-0.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
