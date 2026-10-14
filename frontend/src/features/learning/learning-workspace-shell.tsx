"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Heart, House, Menu, Settings, X } from "lucide-react";
import { PortalBrand } from "@/components/layout/portal-brand";
import { UserMenu } from "@/components/layout/user-menu";
import { StudentAnnouncementBell } from "@/features/notification/student-announcement-bell";
import { cn } from "@/lib/cn";
import { learningNavigationGroups } from "@/features/learning/learning-navigation";

export function LearningWorkspaceShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const previousScrollY = useRef(0);
  const accumulatedScrollDelta = useRef(0);

  useEffect(() => {
    previousScrollY.current = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - previousScrollY.current;
      previousScrollY.current = currentScrollY;
      accumulatedScrollDelta.current += delta;

      if (currentScrollY <= 24) {
        accumulatedScrollDelta.current = 0;
        setHeaderVisible(true);
        return;
      }

      if (accumulatedScrollDelta.current >= 10) {
        accumulatedScrollDelta.current = 0;
        setHeaderVisible(false);
      } else if (accumulatedScrollDelta.current <= -10) {
        accumulatedScrollDelta.current = 0;
        setHeaderVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      data-header-visible={headerVisible ? "true" : "false"}
      className="learning-app min-h-screen text-[#101a2c] lg:flex"
    >
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Đóng menu học tập"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-[#101a2c]/40 backdrop-blur-xs lg:hidden"
        />
      ) : null}

      <aside
        id="learning-sidebar"
        className={cn(
          "learning-sidebar fixed inset-y-0 left-0 z-50 flex w-[261px] shrink-0 flex-col border-r border-slate-200/90 bg-white text-slate-800 shadow-[1px_0_3px_rgba(0,0,0,0.02)] transition-[width,transform] duration-300 ease-in-out motion-reduce:transition-none lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[88px]" : "lg:w-[261px]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-100 px-4 lg:hidden">
          <PortalBrand roleLabel="Học viên" onNavigate={() => setMobileNavOpen(false)} />
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Đóng menu học tập"
            className="focus-ring rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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
                onClick={() => setSidebarCollapsed(false)}
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
              <PortalBrand roleLabel="Học viên" />
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
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

        <nav
          aria-label="Điều hướng học tập"
          className={cn(
            "flex-1 space-y-5 overflow-y-auto px-3 py-4",
            sidebarCollapsed && "lg:space-y-1 lg:px-0",
          )}
        >
          {learningNavigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p
                className={cn(
                  "px-3 pb-1 text-[10px] font-bold tracking-[.12em] text-slate-400",
                  sidebarCollapsed && "lg:hidden",
                )}
              >
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.links.map((item) => {
                  const Icon = item.icon;
                  const selected =
                    item.href === "/learning"
                      ? pathname === item.href
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`) ||
                        (item.href === "/learning/courses" &&
                          pathname.startsWith("/learning/lessons/"));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        aria-current={selected ? "page" : undefined}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={cn(
                          "focus-ring group relative flex h-10 items-center gap-2.5 rounded-xl px-3 text-xs transition-colors",
                          sidebarCollapsed && "lg:justify-center lg:px-0",
                          sidebarCollapsed
                            ? selected
                              ? "bg-transparent font-semibold text-primary shadow-none hover:bg-slate-100/70"
                              : "text-slate-600 hover:bg-slate-100/70 hover:text-[#101a2c]"
                            : selected
                              ? "border border-emerald-200/80 bg-emerald-50/90 font-semibold text-emerald-800 shadow-xs shadow-emerald-950/5"
                              : "font-medium text-slate-600 hover:bg-slate-100/70 hover:text-[#101a2c]",
                        )}
                      >
                        {selected && sidebarCollapsed ? (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-primary"
                          />
                        ) : null}
                        <Icon
                          aria-hidden="true"
                          className={cn(
                            "h-4 w-4 shrink-0 stroke-[1.8]",
                            selected
                              ? "text-primary stroke-[2]"
                              : "text-slate-400 group-hover:text-slate-700",
                          )}
                        />
                        <span className={cn("truncate", sidebarCollapsed && "lg:hidden")}>
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            "mt-auto space-y-1 border-t border-slate-100 py-3",
            sidebarCollapsed ? "px-3 lg:px-2" : "px-3",
          )}
        >
          <Link
            href="/"
            onClick={() => setMobileNavOpen(false)}
            title={sidebarCollapsed ? "Về trang chủ" : undefined}
            className={cn(
              "focus-ring flex h-10 items-center gap-2.5 rounded-xl px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-[#101a2c]",
              sidebarCollapsed && "lg:justify-center lg:px-0",
            )}
          >
            <House aria-hidden="true" className="h-4 w-4 stroke-[1.8]" />
            <span className={sidebarCollapsed ? "lg:hidden" : undefined}>Về trang chủ</span>
          </Link>
          <Link
            href="/profile"
            onClick={() => setMobileNavOpen(false)}
            title={sidebarCollapsed ? "Cài đặt tài khoản" : undefined}
            className={cn(
              "focus-ring flex h-10 items-center gap-2.5 rounded-xl px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-[#101a2c]",
              sidebarCollapsed && "lg:justify-center lg:px-0",
            )}
          >
            <Settings aria-hidden="true" className="h-4 w-4 stroke-[1.8]" />
            <span className={sidebarCollapsed ? "lg:hidden" : undefined}>Cài đặt tài khoản</span>
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header
          id="learning-workspace-header"
          inert={!headerVisible}
          className={cn(
            "sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-slate-200 bg-white px-4 transition-transform duration-200 ease-out motion-reduce:transition-none md:px-6 lg:h-[83px]",
            headerVisible ? "translate-y-0" : "-translate-y-full",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="focus-ring rounded-md p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Mở menu học tập"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              href="/learning/courses"
              className="focus-ring hidden rounded text-xs font-semibold text-slate-500 transition hover:text-primary sm:inline-flex"
            >
              Không gian học tập
            </Link>
            <span aria-hidden="true" className="hidden text-slate-300 sm:inline">
              /
            </span>
            <span className="truncate text-sm font-bold text-slate-800">{title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/learning/favorites"
              aria-label="Khóa học yêu thích"
              title="Khóa học yêu thích"
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
            >
              <Heart className="h-[21px] w-[21px] stroke-[1.8]" aria-hidden="true" />
            </Link>
            <StudentAnnouncementBell />
            <UserMenu showNameTrigger />
          </div>
        </header>

        <div className="learning-main mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-7 md:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
