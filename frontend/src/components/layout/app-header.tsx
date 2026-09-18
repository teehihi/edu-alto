"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const navItems = ["Trang chủ", "Khóa học", "Về chúng tôi", "Liên hệ"];
const authLinkClass =
  "focus-ring inline-flex h-10 items-center justify-center rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-white shadow-xs transition duration-200 hover:bg-primary-dark active:bg-primary-dark";

export function AppHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-white/92 backdrop-blur">
      <div className="container-page flex min-h-[84px] items-center justify-between gap-5 py-3">
        <Link href="/" className="focus-ring rounded-lg" aria-label="Về trang chủ EduAlto">
          <Image
            src="/images/logo-with-text.png"
            alt="EduAlto"
            width={128}
            height={72}
            className="h-14 w-auto object-contain"
            priority
          />
        </Link>

        <div className="hidden min-w-[320px] max-w-[367px] flex-1 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm lg:flex">
          <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
          <label className="sr-only" htmlFor="desktop-search">
            Tìm kiếm khóa học
          </label>
          <input
            id="desktop-search"
            placeholder="Bạn muốn học gì?"
            className="min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-muted"
          />
          <button className="focus-ring inline-flex items-center gap-1 rounded-md bg-primary-soft px-3 py-2 text-sm font-semibold text-primary transition hover:bg-[#d9fff3]">
            Khám phá
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink lg:flex" aria-label="Điều hướng chính">
          {navItems.map((item, index) => (
            <Link
              key={item}
              href={index === 0 ? "/" : "#"}
              className={cn(
                "focus-ring rounded-md transition hover:text-primary",
                index === 0 ? "font-semibold text-primary-dark" : "text-ink"
              )}
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link href="/login" className="focus-ring rounded-md text-sm font-medium text-ink transition hover:text-primary">
            Đăng nhập
          </Link>
          <Link href="/register" className={authLinkClass}>
            Tạo tài khoản
          </Link>
        </div>

        <button
          className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-ink lg:hidden"
          type="button"
          aria-label={isOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-slate-100 bg-white px-5 pb-5 lg:hidden">
          <div className="flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm">
            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <label className="sr-only" htmlFor="mobile-search">
              Tìm kiếm khóa học
            </label>
            <input
              id="mobile-search"
              placeholder="Bạn muốn học gì?"
              className="min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none placeholder:text-muted"
            />
          </div>
          <nav className="mt-4 grid gap-2" aria-label="Điều hướng mobile">
            {navItems.map((item, index) => (
              <Link key={item} href={index === 0 ? "/" : "#"} className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-primary-soft">
                {item}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              href="/login"
              className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-ink transition duration-200 hover:bg-slate-50 active:bg-slate-100"
            >
              Đăng nhập
            </Link>
            <Link href="/register" className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-white transition duration-200 hover:bg-primary-dark active:bg-primary-dark">
              Tạo tài khoản
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
