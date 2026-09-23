"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  GraduationCap,
  Heart,
  LogOut,
  Menu,
  Search,
  Settings,
  ShoppingCart,
  User as UserIcon,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useAuthSession } from "@/lib/auth-session";
import { UserAvatar } from "@/components/ui/user-avatar";

const navItems = [
  { label: "Trang chủ", href: "/" },
  { label: "Khóa học", href: "/courses" },
  { label: "Về chúng tôi", href: "/about" },
  { label: "Liên hệ", href: "/contact" }
];

const authLinkClass =
  "focus-ring inline-flex h-10 items-center justify-center rounded-xl border border-primary bg-primary px-5 text-sm font-semibold text-white shadow-xs transition duration-200 hover:bg-primary-dark active:bg-primary-dark";

export function AppHeader({
  transparent = false,
  sticky = true
}: {
  transparent?: boolean;
  sticky?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuthSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSticky = sticky;
  const isAuthed = mounted && isAuthenticated && Boolean(user);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
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
  }, [isUserMenuOpen]);

  // Close menu on route change
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsOpen(false);
  }, [pathname]);

  const isInstructor = user?.roles?.includes("INSTRUCTOR");
  const roleLabel = isInstructor ? "Giảng viên" : "Học viên";

  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!isSticky) return;

    function handleScroll() {
      const currentScrollY = window.scrollY;

      // Track if we scrolled past the top
      setIsScrolled(currentScrollY > 15);

      // Always show when near top or when mobile menu / user popover is open
      if (currentScrollY <= 20 || isOpen || isUserMenuOpen) {
        setIsVisible(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      // Scrolling down -> hide header; scrolling up -> show header
      if (currentScrollY > lastScrollYRef.current && currentScrollY > 70) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollYRef.current) {
        setIsVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isSticky, isOpen, isUserMenuOpen]);

  async function handleLogout() {
    setIsUserMenuOpen(false);
    setIsOpen(false);
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "z-40 transition-all duration-300 ease-in-out",
        isSticky
          ? cn("sticky top-0", isVisible ? "translate-y-0" : "-translate-y-full pointer-events-none")
          : "relative",
        transparent && !isScrolled
          ? "bg-transparent border-transparent"
          : "border-b border-slate-100 bg-white/95 backdrop-blur-md shadow-xs"
      )}
    >
      <div className="mx-auto flex min-h-[80px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Logo */}
        <Link href="/" className="focus-ring rounded-lg shrink-0" aria-label="Về trang chủ EduAlto">
          <Image
            src="/images/logo-with-text.png"
            alt="EduAlto"
            width={128}
            height={72}
            className="h-[52px] sm:h-[60px] w-auto object-contain"
            priority
          />
        </Link>

        {/* Search Bar */}
        <div className="hidden min-w-[280px] max-w-[340px] flex-1 items-center rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 shadow-xs transition focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 xl:flex">
          <Search className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
          <form className="flex min-w-0 flex-1 items-center" action="/courses" method="get">
            <label className="sr-only" htmlFor="desktop-search">
              Tìm kiếm khóa học
            </label>
            <input
              id="desktop-search"
              name="q"
              placeholder="Bạn muốn học gì?"
              className="min-w-0 flex-1 border-0 bg-transparent px-2 text-xs text-ink outline-none placeholder:text-muted"
            />
            <Link
              href="/courses"
              className="focus-ring inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-[#d9fff3]"
            >
              Khám phá
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </form>
        </div>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-6 text-sm font-semibold text-ink lg:flex" aria-label="Điều hướng chính">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href) && !item.href.includes("#");
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "focus-ring rounded-md py-1 transition",
                  isActive
                    ? "font-bold text-primary"
                    : "text-slate-700 hover:text-primary"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Header After Login Action Icons */}
        <div className="hidden items-center gap-4 lg:flex">
          {isAuthed && user ? (
            <div className="flex items-center gap-4">
              {/* Shopping Cart */}
              <Link
                href="/#courses"
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:text-primary hover:bg-slate-50"
                aria-label="Giỏ hàng"
              >
                <ShoppingCart className="h-[21px] w-[21px] stroke-[1.8]" />
              </Link>

              {/* Wishlist / Favorites */}
              <Link
                href="/#courses"
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:text-primary hover:bg-slate-50"
                aria-label="Khóa học yêu thích"
              >
                <Heart className="h-[21px] w-[21px] stroke-[1.8]" />
              </Link>

              {/* Notification Bell */}
              <button
                type="button"
                className="focus-ring relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:text-primary hover:bg-slate-50"
                aria-label="Thông báo"
              >
                <Bell className="h-[21px] w-[21px] stroke-[1.8]" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
              </button>

              {/* User Avatar + Green Chevron Trigger */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  aria-label={`Menu người dùng: ${user.fullName || "Tài khoản"}`}
                  className="focus-ring group flex items-center gap-1.5 rounded-full p-0.5 transition hover:opacity-90"
                >
                  <UserAvatar
                    name={user.fullName}
                    email={user.email}
                    avatarUrl={user.avatarUrl}
                    size="sm"
                    className="h-[38px] w-[38px] transition-transform group-hover:scale-105"
                  />
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-primary transition-transform duration-200",
                      isUserMenuOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </button>

                {/* User Dropdown Popover */}
                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-3 w-64 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-page z-50"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    {/* User Card inside Popover */}
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-3 mb-1">
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
                        <span className="mt-1 inline-block rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {roleLabel}
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100 my-1" />

                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition hover:bg-slate-50 hover:text-primary",
                        pathname === "/profile" ? "text-primary bg-primary-soft/50" : "text-slate-700"
                      )}
                    >
                      <UserIcon
                        className={cn(
                          "h-4 w-4 transition-colors group-hover:text-primary",
                          pathname === "/profile" ? "text-primary" : "text-slate-400"
                        )}
                      />
                      <span>Trang cá nhân</span>
                    </Link>

                    <Link
                      href="/profile#courses"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-primary"
                    >
                      <GraduationCap className="h-4 w-4 text-slate-400 transition-colors group-hover:text-primary" />
                      <span>Khóa học của tôi</span>
                    </Link>

                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-primary"
                    >
                      <Settings className="h-4 w-4 text-slate-400 transition-colors group-hover:text-primary" />
                      <span>Cài đặt tài khoản</span>
                    </Link>

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4 text-rose-500 transition-colors group-hover:text-rose-600" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="focus-ring inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-ink transition duration-200 hover:text-primary"
              >
                Đăng nhập
              </Link>
              <Link href="/register" className={authLinkClass}>
                Tạo tài khoản
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-ink lg:hidden"
          type="button"
          aria-label={isOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen ? (
        <div className="border-t border-slate-100 bg-white px-4 pb-6 pt-4 lg:hidden animate-page">
          {/* Mobile Search */}
          <form className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-xs" action="/courses" method="get">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <label className="sr-only" htmlFor="mobile-search">
              Tìm kiếm khóa học
            </label>
            <input
              id="mobile-search"
              name="q"
              placeholder="Bạn muốn học gì?"
              className="min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none placeholder:text-muted"
            />
          </form>

          {/* User info if authenticated */}
          {isAuthed && user ? (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="flex items-center gap-3">
                <UserAvatar name={user.fullName} email={user.email} avatarUrl={user.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-heading">{user.fullName || "Tài khoản"}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                  {roleLabel}
                </span>
              </div>
            </div>
          ) : null}

          {/* Nav links */}
          <nav className="mt-4 grid gap-1" aria-label="Điều hướng mobile">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-primary-soft hover:text-primary transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Actions */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            {isAuthed ? (
              <div className="grid gap-2">
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "group focus-ring flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 hover:text-primary",
                    pathname === "/profile"
                      ? "border-primary/30 bg-primary-soft/40 text-primary"
                      : "border-slate-200 bg-white text-ink"
                  )}
                >
                  <UserIcon
                    className={cn(
                      "h-4 w-4 transition-colors group-hover:text-primary",
                      pathname === "/profile" ? "text-primary" : "text-slate-400"
                    )}
                  />
                  <span>Trang cá nhân</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="group focus-ring flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  <LogOut className="h-4 w-4 text-rose-500 transition-colors group-hover:text-rose-600" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="focus-ring inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink transition hover:bg-slate-50"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="focus-ring inline-flex h-11 items-center justify-center rounded-xl border border-primary bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
                >
                  Tạo tài khoản
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
