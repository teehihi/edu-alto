"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  GraduationCap,
  Heart,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  User as UserIcon,
  X,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { readCart } from "@/lib/cart";
import { useAuthSession } from "@/lib/auth-session";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserMenu } from "@/components/layout/user-menu";
import { StudentAnnouncementBell } from "@/features/notification/student-announcement-bell";

const navItems = [
  { label: "Trang chủ", href: "/" },
  { label: "Khóa học", href: "/courses" },
  { label: "Về chúng tôi", href: "/about" },
  { label: "Liên hệ", href: "/contact" },
];

const authLinkClass =
  "focus-ring inline-flex h-10 items-center justify-center rounded-xl border border-primary bg-primary px-5 text-sm font-semibold text-white shadow-xs transition duration-200 hover:bg-primary-dark active:bg-primary-dark";
const subscribeToMount = () => () => {};

function subscribeCart(callback: () => void) {
  window.addEventListener("edualto:cart-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("edualto:cart-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

function getCartSnapshot() {
  return readCart().length;
}

function getCartServerSnapshot() {
  return 0;
}

export const HeaderCartButton = memo(function HeaderCartButton({
  isMobile = false,
}: {
  isMobile?: boolean;
}) {
  const count = useSyncExternalStore(subscribeCart, getCartSnapshot, getCartServerSnapshot);

  if (isMobile) {
    return (
      <Link
        href="/cart"
        className="focus-ring relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors duration-200 hover:text-primary lg:hidden"
        aria-label={count ? `Mở giỏ hàng, ${count} khóa học` : "Mở giỏ hàng"}
      >
        <ShoppingCart className="h-5 w-5 stroke-[1.8]" aria-hidden="true" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-0 top-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white"
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href="/cart"
      className="focus-ring relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors duration-200 hover:text-primary"
      aria-label={count ? `Giỏ hàng, ${count} khóa học` : "Giỏ hàng"}
    >
      <ShoppingCart className="h-[21px] w-[21px] stroke-[1.8]" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
});

const HeaderNavLinks = memo(function HeaderNavLinks({ pathname }: { pathname: string }) {
  return (
    <nav
      className="hidden items-center gap-6 text-sm font-semibold text-ink lg:flex"
      aria-label="Điều hướng chính"
    >
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
              isActive ? "font-bold text-primary" : "text-slate-700 hover:text-primary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
});

export const AppHeader = memo(function AppHeader({
  transparent = false,
  sticky = true,
  height = "default",
  className,
  transparentBg = "bg-[#E6F7F2]",
}: {
  transparent?: boolean;
  sticky?: boolean;
  height?: "default" | "checkout";
  className?: string;
  transparentBg?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuthSession();

  const handleLogout = useCallback(async () => {
    setIsOpen(false);
    await logout();
    router.push("/login");
    router.refresh();
  }, [logout, router]);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  const isSticky = sticky;
  const isAuthed = mounted && isAuthenticated && Boolean(user);

  const isAdmin = user?.roles?.some((r) => r === "ADMIN" || r === "ROLE_ADMIN");
  const isInstructor = user?.roles?.some((r) => r === "INSTRUCTOR" || r === "ROLE_INSTRUCTOR");
  const roleLabel = isAdmin ? "Quản trị viên" : isInstructor ? "Giảng viên" : "Học viên";

  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!isSticky) return;

    function handleScroll() {
      const currentScrollY = window.scrollY;

      // Track if we scrolled past the top
      setIsScrolled(currentScrollY > 15);

      // Always show when near top or when mobile menu is open
      if (currentScrollY <= 20 || isOpen) {
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

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isSticky, isOpen]);

  return (
    <header
      className={cn(
        "z-[70] transition-transform duration-200 ease-in-out",
        isSticky
          ? cn(
              "sticky top-0",
              isVisible ? "translate-y-0" : "-translate-y-full pointer-events-none",
            )
          : "relative",
        transparent && !isScrolled
          ? cn("border-transparent shadow-none", transparentBg)
          : "border-b border-slate-100 bg-white/95 backdrop-blur-md shadow-xs",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-12",
          height === "checkout"
            ? "min-h-[80px] lg:min-h-[100px] xl:max-w-[1200px] xl:px-0"
            : "min-h-[80px]",
        )}
      >
        {/* Logo */}
        <Link href="/" className="focus-ring rounded-lg shrink-0" aria-label="Về trang chủ EduAlto">
          <Image
            src="/images/logo-with-text.png"
            alt="EduAlto"
            width={128}
            height={72}
            className={cn(
              "h-[52px] sm:h-[60px] w-auto object-contain",
              height === "checkout" && "lg:h-[68px]",
            )}
            priority
          />
        </Link>

        {/* Search Bar */}
        <div className="hidden w-[280px] shrink-0 items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1 shadow-xs transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 xl:flex">
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
              className="focus-ring inline-flex h-7 items-center gap-1 rounded-md bg-primary-soft px-2.5 text-xs font-semibold text-primary transition hover:bg-[#d9fff3]"
            >
              Khám phá
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </form>
        </div>

        {/* Navigation Links */}
        <HeaderNavLinks pathname={pathname} />

        {/* Right Section: Header After Login Action Icons */}
        <div className="hidden items-center gap-3 lg:flex">
          {isAuthed && user ? (
            <div className="flex items-center gap-4">
              {/* Shopping Cart */}
              {!isInstructor ? <HeaderCartButton /> : null}

              {/* Wishlist / Favorites */}
              <Link
                href="/favorites"
                className="focus-ring flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:text-primary"
                aria-label="Khóa học yêu thích"
              >
                <Heart className="h-[21px] w-[21px] stroke-[1.8]" />
              </Link>

              <StudentAnnouncementBell />

              <UserMenu />
            </div>
          ) : !mounted || isAuthLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-10 w-24 animate-pulse rounded-xl bg-slate-100/70" />
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

        {/* Mobile Actions: Cart + Hamburger */}
        <div className="flex items-center gap-1 sm:gap-2 lg:hidden">
          {!isAuthLoading && !isInstructor ? <HeaderCartButton isMobile /> : null}
          <button
            className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-ink"
            type="button"
            aria-label={isOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((value) => !value)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen ? (
        <div className="border-t border-slate-100 bg-white px-4 pb-6 pt-4 lg:hidden animate-page">
          {/* Mobile Search */}
          <form
            className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-xs"
            action="/courses"
            method="get"
          >
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
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="mt-4 block rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition-colors hover:bg-primary-soft/60 focus-ring"
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={user.fullName}
                  email={user.email}
                  avatarUrl={user.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-heading">
                    {user.fullName || "Tài khoản"}
                  </p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                  {roleLabel}
                </span>
              </div>
            </Link>
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
                {!isInstructor ? (
                  <Link
                    href="/learning"
                    onClick={() => setIsOpen(false)}
                    className="focus-ring flex items-center gap-2.5 rounded-xl border border-primary/25 bg-primary-soft/40 px-4 py-2.5 text-sm font-semibold text-primary"
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>Khu vực học tập</span>
                  </Link>
                ) : null}
                {isAdmin ? (
                  <Link
                    href="/admin/payments"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "focus-ring flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                      pathname.startsWith("/admin")
                        ? "border-primary/30 bg-primary-soft/40 text-primary"
                        : "border-slate-200 bg-white text-ink hover:bg-slate-50 hover:text-primary",
                    )}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Quản trị hệ thống</span>
                  </Link>
                ) : null}
                {isInstructor ? (
                  <Link
                    href="/instructor"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "focus-ring flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                      pathname.startsWith("/instructor")
                        ? "border-primary/30 bg-primary-soft/40 text-primary"
                        : "border-slate-200 bg-white text-ink hover:bg-slate-50 hover:text-primary",
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Bảng điều khiển giảng viên</span>
                  </Link>
                ) : null}
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "group focus-ring flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 hover:text-primary",
                    pathname === "/profile"
                      ? "border-primary/30 bg-primary-soft/40 text-primary"
                      : "border-slate-200 bg-white text-ink",
                  )}
                >
                  <UserIcon
                    className={cn(
                      "h-4 w-4 transition-colors group-hover:text-primary",
                      pathname === "/profile" ? "text-primary" : "text-slate-400",
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
            ) : !mounted || isAuthLoading ? (
              <div className="h-11 animate-pulse rounded-xl bg-slate-100/70" />
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
});
