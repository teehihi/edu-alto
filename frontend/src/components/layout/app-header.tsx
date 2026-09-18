"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useAuthSession } from "@/lib/auth-session";

const navItems = [
  { label: "Trang chủ", href: "/" },
  { label: "Khóa học", href: "/#courses" },
  { label: "Về chúng tôi", href: "/#about" },
  { label: "Liên hệ", href: "/#contact" }
];
const authLinkClass =
  "focus-ring inline-flex h-10 items-center justify-center rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-white shadow-xs transition duration-200 hover:bg-primary-dark active:bg-primary-dark";

export function AppHeader({ transparent = false }: { transparent?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthSession();

  return (
    <header className={cn("z-40", transparent ? "absolute inset-x-0 top-0 bg-transparent" : "sticky top-0 border-b border-transparent bg-white/95 backdrop-blur")}>
      <div className="mx-auto flex min-h-[100px] w-full max-w-[1200px] items-center justify-between gap-5 px-5 sm:px-6 lg:px-0">
        <Link href="/" className="focus-ring rounded-lg" aria-label="Về trang chủ EduAlto">
          <Image
            src="/images/logo-with-text.png"
            alt="EduAlto"
            width={128}
            height={72}
            className="h-[72px] w-auto object-contain"
            priority
          />
        </Link>

        <div className="hidden min-w-[330px] max-w-[370px] flex-1 items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm xl:flex">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <form className="flex min-w-0 flex-1 items-center" action="/" method="get">
            <label className="sr-only" htmlFor="desktop-search">Tìm kiếm khóa học</label>
            <input
              id="desktop-search"
              name="q"
              placeholder="Bạn muốn học gì?"
              className="min-w-0 flex-1 border-0 bg-transparent px-2 text-xs text-ink outline-none placeholder:text-muted"
            />
            <button type="submit" className="focus-ring inline-flex items-center gap-1 rounded-md bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-[#d9fff3]">
            Khám phá
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>

        <nav className="hidden items-center gap-6 text-base font-semibold text-ink xl:flex" aria-label="Điều hướng chính">
          {navItems.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "focus-ring rounded-md transition hover:text-primary",
                index === 0 ? "font-semibold text-primary-dark" : "text-ink"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 xl:flex">
          {isAuthenticated ? (
            <>
              <Link href="/profile" className="focus-ring max-w-[150px] truncate rounded-lg text-sm font-semibold text-ink transition hover:text-primary">{user?.fullName ?? "Tài khoản"}</Link>
              <button type="button" onClick={() => void logout()} className="focus-ring rounded-lg text-sm font-semibold text-ink transition hover:text-primary">Đăng xuất</button>
            </>
          ) : (
            <>
              <Link href="/login" className="focus-ring inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-ink transition duration-200 hover:text-primary">Đăng nhập</Link>
              <Link href="/register" className={authLinkClass}>Tạo tài khoản</Link>
            </>
          )}
        </div>

        <button
          className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-ink xl:hidden"
          type="button"
          aria-label={isOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-slate-100 bg-white px-5 pb-5 xl:hidden">
          <form className="flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm" action="/" method="get">
            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <label className="sr-only" htmlFor="mobile-search">
              Tìm kiếm khóa học
            </label>
            <input
              id="mobile-search"
              name="q"
              placeholder="Bạn muốn học gì?"
              className="min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none placeholder:text-muted"
            />
            <button type="submit" className="sr-only">Tìm kiếm</button>
          </form>
          <nav className="mt-4 grid gap-2" aria-label="Điều hướng mobile">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} onClick={() => setIsOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-primary-soft">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {isAuthenticated ? (
              <>
                <Link href="/profile" onClick={() => setIsOpen(false)} className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-ink transition hover:bg-slate-50">{user?.fullName ?? "Tài khoản"}</Link>
                <button type="button" onClick={() => { setIsOpen(false); void logout(); }} className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-ink transition hover:bg-slate-50">Đăng xuất</button>
              </>
            ) : (
              <>
            <Link
              href="/login"
              className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-ink transition duration-200 hover:bg-slate-50 active:bg-slate-100"
            >
              Đăng nhập
            </Link>
            <Link href="/register" className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-white transition duration-200 hover:bg-primary-dark active:bg-primary-dark">
              Tạo tài khoản
            </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
