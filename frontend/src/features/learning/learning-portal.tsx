"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  BookmarkCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  FolderClosed,
  FileText,
  GraduationCap,
  Home,
  House,
  Menu,
  LogOut,
  MessageCircle,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
  Send,
  MoreHorizontal,
  SlidersHorizontal,
  User as UserIcon,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ApiClientError } from "@/lib/api";
import { fetchMyAssignments, submitAssignment, type Assignment } from "@/lib/assignment-client";
import {
  createLearningNote,
  deleteLearningNote,
  fetchCourseProgress,
  fetchMyEnrollments,
  fetchMyNotes,
  updateLearningNote,
  type CourseProgress,
  type Enrollment,
  type LearningNote,
} from "@/lib/learning-client";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvents,
  updateCalendarEvent,
  type CalendarEvent,
} from "@/lib/schedule-client";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";
import { SavedLessonsView } from "@/features/learning/saved-lessons-view";
import { CertificateListView } from "@/features/learning/certificate-list-view";

type PortalView =
  | "overview"
  | "courses"
  | "certificates"
  | "savedLessons"
  | "assignments"
  | "calendar"
  | "discussion"
  | "resources"
  | "notes"
  | "messages"
  | "teachers"
  | "reviews";

const navGroups = [
  {
    title: "HỌC TẬP",
    links: [
      { label: "Tổng quan", href: "/learning", view: "overview" as const, icon: Home },
      {
        label: "Bài tập",
        href: "/learning/assignments",
        view: "assignments" as const,
        icon: ClipboardList,
      },
      {
        label: "Thời khóa biểu",
        href: "/learning/calendar",
        view: "calendar" as const,
        icon: CalendarDays,
      },
      {
        label: "Thảo luận",
        href: "/learning/discussion",
        view: "discussion" as const,
        icon: MessageCircle,
      },
      {
        label: "Tài liệu",
        href: "/learning/resources",
        view: "resources" as const,
        icon: FolderClosed,
      },
      { label: "Ghi chú", href: "/learning/notes", view: "notes" as const, icon: NotebookPen },
      {
        label: "Khóa học của tôi",
        href: "/learning/courses",
        view: "courses" as const,
        icon: GraduationCap,
      },
      {
        label: "Chứng chỉ của tôi",
        href: "/learning/certificates",
        view: "certificates" as const,
        icon: GraduationCap,
      },
      {
        label: "Bài học đã lưu",
        href: "/learning/saved-lessons",
        view: "savedLessons" as const,
        icon: BookmarkCheck,
      },
    ],
  },
  {
    title: "KHÁM PHÁ",
    links: [
      {
        label: "Giảng viên",
        href: "/learning/teachers",
        view: "teachers" as const,
        icon: GraduationCap,
      },
      {
        label: "Đánh giá của tôi",
        href: "/learning/reviews",
        view: "reviews" as const,
        icon: Sparkles,
      },
    ],
  },
];

const viewTitles: Record<PortalView, string> = {
  overview: "Tổng quan học tập",
  courses: "Khóa học của tôi",
  certificates: "Chứng chỉ của tôi",
  savedLessons: "Bài học đã lưu",
  assignments: "Bài tập",
  calendar: "Thời khóa biểu",
  discussion: "Thảo luận",
  resources: "Tài liệu đã lưu",
  notes: "Ghi chú",
  messages: "Tin nhắn",
  teachers: "Giảng viên của tôi",
  reviews: "Đánh giá của tôi",
};

const upcomingTasks = [
  {
    id: "quiz",
    title: "Ôn tập kiến thức tuần này",
    detail: "Bài tập tự ôn tập",
    date: "Hôm nay",
    done: false,
  },
  {
    id: "lesson",
    title: "Tiếp tục bài học đang học",
    detail: "Khóa học của bạn",
    date: "Hôm nay",
    done: false,
  },
];

export function LearningPortal({ view }: { view: PortalView }) {
  const { user, isLoading, getAccessToken, logout } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressByCourse, setProgressByCourse] = useState<Record<string, CourseProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsUserMenuOpen(false);
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

  async function handleLogout() {
    setIsUserMenuOpen(false);
    await logout();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (view !== "overview" && view !== "courses") {
      const timer = window.setTimeout(() => {
        setError("");
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    void getAccessToken()
      .then((token) => {
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return fetchMyEnrollments(token).then(async (page) => {
          if (!active) return;
          setEnrollments(page.data);
          const entries = await Promise.all(
            page.data
              .filter((item) => item.courseStatus === "PUBLISHED")
              .map(async (item) => {
                try {
                  return [item.courseId, await fetchCourseProgress(token, item.courseId)] as const;
                } catch {
                  return null;
                }
              }),
          );
          if (active)
            setProgressByCourse(Object.fromEntries(entries.filter((item) => item !== null)));
        });
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof ApiClientError
              ? reason.message
              : "Chưa thể tải dữ liệu học tập. Vui lòng thử lại.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [getAccessToken, isLoading, pathname, router, user, view]);

  const visibleCourses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    return enrollments.filter(
      (item) => !query || item.courseTitle.toLocaleLowerCase("vi").includes(query),
    );
  }, [enrollments, search]);
  return (
    <div className="learning-app min-h-screen bg-white text-[#101a2c]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={cn(
            "learning-sidebar fixed inset-y-0 left-0 z-50 w-[223px] border-r border-[#e4e4e4] bg-[#f9f9f9] transition-transform duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-[58px] items-center justify-between border-b border-[#e4e4e4] px-4 lg:hidden">
            <Link href="/" aria-label="EduAlto - Trang chủ" className="focus-ring rounded">
              <Image src="/images/logo-w-text.png" alt="EduAlto" width={112} height={54} priority />
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Đóng menu"
              className="focus-ring rounded-md p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="hidden h-[83px] items-center border-b border-[#e4e4e4] px-[15px] lg:flex">
            <Link
              href="/"
              className="focus-ring inline-flex items-center rounded"
              aria-label="EduAlto - Trang chủ"
            >
              <Image src="/images/logo-w-text.png" alt="EduAlto" width={127} height={71} priority />
            </Link>
          </div>
          <nav aria-label="Điều hướng học tập" className="space-y-5 px-[14px] py-[15px]">
            {navGroups
              .filter((group) => group.title !== "KHÁM PHÁ")
              .map((group) => (
                <div key={group.title}>
                  <p className="mb-2 px-3 text-[10px] font-bold tracking-[.12em] text-[#a2a2a2]">
                    {group.title}
                  </p>
                  <ul className="space-y-1">
                    {group.links.map((item) => {
                      const Icon = item.icon;
                      const selected =
                        item.view === view || (view === "messages" && item.view === "discussion");
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileNavOpen(false)}
                            aria-current={selected ? "page" : undefined}
                            className={cn(
                              "focus-ring flex h-8 items-center gap-3 rounded px-[7px] text-[12px] font-medium transition",
                              selected
                                ? "bg-[#079367] text-white"
                                : "text-[#727272] hover:bg-[#eeeeee] hover:text-[#078d67]",
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            <div className="border-t border-[#edf1ef] pt-4">
              <Link
                href="/"
                className="focus-ring flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-[#66736f] hover:bg-[#eefaf6] hover:text-primary"
              >
                <House className="h-4 w-4" />
                Về trang chủ
              </Link>
              <Link
                href="/profile"
                className="focus-ring mt-1 flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-[#66736f] hover:bg-[#eefaf6] hover:text-primary"
              >
                <Settings className="h-4 w-4" />
                Cài đặt tài khoản
              </Link>
            </div>
          </nav>
        </aside>
        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-[#101a2c]/30 lg:hidden"
          />
        )}
        <section className="min-w-0 flex-1">
          <div className="learning-topbar sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-[#e4e4e4] bg-[#f9f9f9] px-4 md:px-6 lg:h-[83px]">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="focus-ring rounded-md p-2 text-[#64716e] lg:hidden"
                aria-label="Mở menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <label className="hidden h-11 w-[367px] items-center gap-2 rounded-lg border border-[#b7e4d7] bg-white px-3 sm:flex">
                <Search className="h-4 w-4 text-[#94a39e]" />
                <span className="sr-only">Tìm kiếm</span>
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent text-xs outline-none placeholder:text-[#98a39e]"
                  placeholder="Bạn muốn học gì?"
                />
              </label>
            </div>
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                aria-label={`Menu người dùng: ${user?.fullName ?? "Học viên"}`}
                className="focus-ring flex items-center gap-2 rounded-full p-1 transition hover:opacity-90"
              >
                <UserAvatar
                  name={user?.fullName ?? "Học viên"}
                  avatarUrl={user?.avatarUrl ?? null}
                />
                <span className="hidden max-w-44 truncate text-xs font-medium text-[#27332f] sm:inline">
                  {user?.fullName ?? "Học viên"}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-primary transition-transform",
                    isUserMenuOpen && "rotate-180",
                  )}
                />
              </button>
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-100 bg-white p-2 shadow-xl"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="mb-1 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <UserAvatar
                      name={user?.fullName ?? "Học viên"}
                      avatarUrl={user?.avatarUrl ?? null}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-heading">
                        {user?.fullName ?? "Học viên"}
                      </p>
                      <p className="truncate text-[11px] text-muted">{user?.email}</p>
                      <span className="mt-1 inline-block rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Học viên
                      </span>
                    </div>
                  </div>
                  <div className="my-1 h-px bg-slate-100" />
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-primary"
                  >
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    Trang cá nhân
                  </Link>
                  <Link
                    href="/learning/courses"
                    role="menuitem"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-primary"
                  >
                    <GraduationCap className="h-4 w-4 text-slate-400" />
                    Khóa học của tôi
                  </Link>
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-primary"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    Cài đặt tài khoản
                  </Link>
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
          <main className="learning-main mx-auto min-h-[calc(100vh-83px)] max-w-[1600px] px-4 py-5 md:px-7 md:py-6 xl:px-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div
                className={
                  view === "overview" || view === "calendar" || view === "messages" ? "sr-only" : ""
                }
              >
                <h1 className="text-xl font-semibold text-[#079367] md:text-[18px]">
                  {view === "assignments" ? "Bài tập" : viewTitles[view]}
                </h1>
                {view === "assignments" && (
                  <p className="mt-0.5 text-sm text-[#8c9297]">
                    Xem và quản lý bài tập trong khóa học của bạn
                  </p>
                )}
              </div>
              {view === "courses" && (
                <Link
                  href="/courses"
                  className="focus-ring hidden h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75] sm:inline-flex"
                >
                  <BookOpen className="h-4 w-4" />
                  Khám phá khóa học
                </Link>
              )}
            </div>
            {loading ? (
              <PortalLoading />
            ) : error ? (
              <ErrorPanel message={error} onRetry={() => window.location.reload()} />
            ) : view === "overview" ? (
              <Overview
                userName={user?.fullName ?? "bạn"}
                enrollments={visibleCourses}
                progress={progressByCourse}
              />
            ) : view === "courses" ? (
              <MyCourses
                courses={visibleCourses}
                progress={progressByCourse}
                search={search}
                onSearch={setSearch}
              />
            ) : view === "savedLessons" ? (
              <SavedLessonsView />
            ) : view === "certificates" ? (
              <CertificateListView />
            ) : (
              <UtilityView view={view} />
            )}
          </main>
        </section>
      </div>
    </div>
  );
}

function PortalLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải dữ liệu học tập"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <div className="skeleton h-44 rounded-xl" />
      <div className="skeleton h-44 rounded-xl" />
      <div className="skeleton h-44 rounded-xl" />
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-white p-8 text-center">
      <p className="font-semibold text-[#101a2c]">Chưa thể tải khu vực học tập</p>
      <p className="mt-2 text-sm text-[#667085]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
      >
        Thử lại
      </button>
    </div>
  );
}

function Overview({
  userName,
  enrollments,
  progress,
}: {
  userName: string;
  enrollments: Enrollment[];
  progress: Record<string, CourseProgress>;
}) {
  const recent = enrollments.slice(0, 3);
  const totalCompleted = Object.values(progress).reduce(
    (sum, item) => sum + item.completedLessons,
    0,
  );
  const totalLessons = Object.values(progress).reduce((sum, item) => sum + item.totalLessons, 0);
  const [tasks, setTasks] = useState(upcomingTasks);
  const completion = totalLessons ? Math.round((totalCompleted / totalLessons) * 100) : 0;
  const days = Array.from({ length: new Date().getDate() }, (_, index) => index + 1);
  const firstWeekday = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();
  const monthName = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(
    new Date(),
  );
  return (
    <div className="space-y-4">
      <section className="px-1 pb-1">
        <h1 className="text-[25px] font-semibold tracking-[-0.02em] text-[#101a2c]">
          Chào, <span className="text-[#079367]">{userName}</span>{" "}
          <span aria-hidden="true">👋🏻</span>
        </h1>
        <p className="mt-0.5 text-sm text-[#858b91]">
          Hôm nay chúng ta hãy cùng học điều gì đó mới mẻ nhé!
        </p>
      </section>
      <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr_1fr]">
        <section className="portal-card">
          <SectionHeading
            title="Khóa học đã đăng ký gần đây"
            action="Xem tất cả"
            href="/learning/courses"
          />
          {recent[0] ? (
            <div className="mt-3">
              <RecentCourse course={recent[0]} progress={progress[recent[0].courseId]} />
            </div>
          ) : (
            <SmallEmpty
              icon={<BookOpen className="h-5 w-5" />}
              title="Bắt đầu hành trình học tập"
              detail="Khám phá khóa học và lưu lại khóa đầu tiên của bạn."
              action="Tìm khóa học"
              href="/courses"
            />
          )}
        </section>
        <section className="portal-card">
          <SectionHeading
            title="Tài liệu bạn đã lưu"
            action="Xem thêm"
            href="/learning/resources"
          />
          <div className="mt-3 grid min-h-[126px] place-items-center rounded-lg border border-dashed border-[#e5eeea] bg-[#fcfefd] px-4 text-center">
            <div>
              <FolderClosed className="mx-auto h-5 w-5 text-[#20b486]" />
              <p className="mt-2 text-xs font-medium text-[#667085]">
                Tài liệu đã lưu sẽ hiển thị tại đây
              </p>
              <Link
                href="/learning/resources"
                className="mt-2 inline-block text-xs font-medium text-primary"
              >
                Mở thư viện tài liệu
              </Link>
            </div>
          </div>
        </section>
        <section className="portal-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold capitalize text-[#079367]">{monthName}</h2>
            <Link href="/learning/calendar" className="text-xs font-medium text-primary">
              Mở lịch
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-7 text-center text-[9px] text-[#87928d]">
            {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center text-[10px]">
            {Array.from({ length: firstWeekday }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {days.map((day) => (
              <span
                key={day}
                className={cn(
                  "mx-auto grid h-5 w-5 place-items-center rounded-full",
                  day === new Date().getDate() && "bg-[#079367] font-semibold text-white",
                )}
              >
                {day}
              </span>
            ))}
          </div>
        </section>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_.8fr_1.2fr]">
        <section className="portal-card">
          <SectionHeading title="Thời gian học" />
          <div className="mt-3 rounded-lg border border-[#edf1ef] p-3">
            <div className="flex gap-3 text-[10px] text-[#667085]">
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-sm bg-[#079367]" />
                Học tập
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-sm bg-[#c8f5e8]" />
                Kiểm tra
              </span>
            </div>
            <div className="mt-3 grid h-[112px] grid-cols-5 items-end gap-3 border-b border-dashed border-[#e5e9ec] px-2">
              {recent.length ? (
                recent.map((course) => (
                  <div key={course.id} className="flex h-full items-end">
                    <span
                      className="w-full rounded-t bg-[#079367]"
                      style={{
                        height: `${Math.max(10, progress[course.courseId]?.progressPercent ?? 10)}%`,
                      }}
                    />
                  </div>
                ))
              ) : (
                <p className="col-span-5 self-center text-center text-[10px] text-[#98a19e]">
                  Chưa có dữ liệu thời gian học
                </p>
              )}
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-[#8a9591]">
              {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
          </div>
        </section>
        <section className="portal-card">
          <SectionHeading title="Hiệu suất" />
          <div className="mt-3 grid min-h-[151px] place-items-center rounded-lg border border-[#edf1ef]">
            <div className="text-center">
              <div className="relative mx-auto grid h-[82px] w-[112px] place-items-center overflow-hidden">
                <div className="absolute top-3 h-[96px] w-[96px] rounded-full border-[9px] border-[#d7f6eb] border-b-transparent" />
                <div
                  className="absolute top-3 h-[96px] w-[96px] rounded-full border-[9px] border-[#079367] border-b-transparent"
                  style={{ clipPath: `inset(0 ${100 - completion}% 0 0)` }}
                />
                <span className="absolute bottom-1 h-3 w-3 rounded-full border-2 border-[#079367] bg-white" />
              </div>
              <p className="mt-1 text-xs">
                Bài học hoàn thành: <b className="text-primary">{completion}%</b>
              </p>
            </div>
          </div>
        </section>
        <section className="portal-card">
          <SectionHeading title="Việc cần làm" />
          <div className="mt-2 divide-y divide-[#e8ecee]">
            {tasks.map((task) => (
              <label key={task.id} className="flex cursor-pointer items-start gap-2.5 py-2.5">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() =>
                    setTasks((items) =>
                      items.map((item) =>
                        item.id === task.id ? { ...item, done: !item.done } : item,
                      ),
                    )
                  }
                  className="mt-0.5 h-3.5 w-3.5 accent-[#079367]"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-xs font-medium",
                      task.done && "text-[#9ba5a1] line-through",
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="mt-1 block text-[10px] text-[#8a9591]">
                    {task.detail} · {task.date}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <Link
            href="/learning/assignments"
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            Xem bài tập <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
      <section className="portal-card">
        <SectionHeading
          title="Sự kiện sắp tới"
          action="Mở thời khóa biểu"
          href="/learning/calendar"
        />
        <div className="mt-3 grid min-h-[100px] place-items-center rounded-lg bg-[#fcfefd] text-center">
          <div>
            <CalendarDays className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-2 text-xs text-[#87928d]">
              Sự kiện trong lịch học sẽ hiển thị tại đây.
            </p>
            <Link
              href="/learning/calendar"
              className="mt-2 inline-block text-xs font-medium text-primary"
            >
              Mở thời khóa biểu
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  title,
  action,
  href,
}: {
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-[#078e69]">{title}</h2>
      {action && href && (
        <Link
          href={href}
          className="focus-ring rounded text-xs font-medium text-primary hover:underline"
        >
          {action}
          <span className="sr-only">: {title}</span>
        </Link>
      )}
    </div>
  );
}

function RecentCourse({
  course,
  progress,
  compact = false,
}: {
  course: Enrollment;
  progress?: CourseProgress;
  compact?: boolean;
}) {
  const archived = course.courseStatus !== "PUBLISHED";
  const percent = progress?.progressPercent ?? 0;
  return (
    <article
      className={cn(
        "rounded-xl border border-[#e9efec] bg-white p-3 transition hover:border-[#bce8d8] hover:shadow-sm",
        compact && "flex items-center gap-3",
      )}
    >
      <div className={cn("flex items-center gap-3", compact && "min-w-0 flex-1")}>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e5f8f1] text-primary">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/learning/courses/${course.courseId}`}
            className="focus-ring line-clamp-1 text-sm font-semibold text-[#26332e] hover:text-primary"
          >
            {course.courseTitle}
          </Link>
          <p className="mt-1 text-[11px] text-[#89948f]">
            {archived
              ? "Khóa học đã lưu trữ"
              : progress
                ? `${progress.completedLessons}/${progress.totalLessons} bài đã hoàn thành`
                : "Đang cập nhật tiến độ"}
          </p>
        </div>
        {compact && (
          <Link
            href={archived ? "/courses" : `/learning/courses/${course.courseId}`}
            className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
          >
            {archived ? "Khám phá" : "Tiếp tục"}
          </Link>
        )}
      </div>
      {!compact && (
        <>
          <div className="mt-3 flex items-center justify-between text-[10px] text-[#89948f]">
            <span>Tiến độ học</span>
            <span>{archived ? "—" : `${percent}%`}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf3f0]">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${archived ? 0 : percent}%` }}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Link
              href={archived ? "/courses" : `/learning/courses/${course.courseId}`}
              className="focus-ring inline-flex h-8 items-center gap-1 rounded-lg bg-[#e5faf2] px-3 text-[11px] font-semibold text-primary hover:bg-[#d5f4e8]"
            >
              {archived ? "Khám phá lại" : "Tiếp tục học"}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      )}
    </article>
  );
}

function SmallEmpty({
  icon,
  title,
  detail,
  action,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  action: string;
  href: string;
}) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-[#dce8e2] bg-[#fbfefc] px-4 py-7 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e6faf3] text-primary">
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-[#26332e]">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[#87928e]">{detail}</p>
      <Link
        href={href}
        className="focus-ring mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
      >
        {action}
      </Link>
    </div>
  );
}

function MyCourses({
  courses,
  progress,
  search,
  onSearch,
}: {
  courses: Enrollment[];
  progress: Record<string, CourseProgress>;
  search: string;
  onSearch: (value: string) => void;
}) {
  const [sortOrder, setSortOrder] = useState<"recent" | "title">("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const filteredCourses = [...courses]
    .filter(
      (course) =>
        statusFilter === "all" ||
        (statusFilter === "archived"
          ? course.courseStatus !== "PUBLISHED"
          : course.courseStatus === "PUBLISHED"),
    )
    .sort((left, right) =>
      sortOrder === "title"
        ? left.courseTitle.localeCompare(right.courseTitle, "vi")
        : new Date(right.enrolledAt).getTime() - new Date(left.enrolledAt).getTime(),
    );
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-10 w-full max-w-[380px] items-center gap-2 rounded-lg border border-[#dce7e2] px-3">
          <Search className="h-4 w-4 text-primary" />
          <span className="sr-only">Tìm kiếm khóa học đã ghi danh</span>
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Tìm kiếm khóa học..."
            className="min-w-0 flex-1 text-sm outline-none placeholder:text-[#9aa49f]"
          />
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#727272]">Xếp theo</span>
          <select
            aria-label="Sắp xếp khóa học"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
            className="focus-ring h-9 rounded-md border border-primary bg-white px-3"
          >
            <option value="recent">Mới nhất</option>
            <option value="title">Tên khóa học</option>
          </select>
          <button
            type="button"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((open) => !open)}
            className="focus-ring flex h-9 items-center gap-2 rounded-md border border-primary px-3 text-primary"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Lọc
          </button>
          {showFilters && (
            <select
              aria-label="Lọc trạng thái khóa học"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="focus-ring h-9 rounded-md border border-[#dce7e2] bg-white px-2"
            >
              <option value="all">Tất cả khóa học</option>
              <option value="active">Đang học</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
          )}
          <span className="hidden text-[#7c8783] sm:inline">{filteredCourses.length} khóa học</span>
        </div>
      </div>
      {filteredCourses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCourses.map((course, index) => (
            <CourseGridCard
              key={course.id}
              course={course}
              progress={progress[course.courseId]}
              index={index}
            />
          ))}
        </div>
      ) : (
        <SmallEmpty
          icon={<BookOpen className="h-5 w-5" />}
          title={
            search || statusFilter !== "all"
              ? "Không tìm thấy khóa học"
              : "Bạn chưa ghi danh khóa học nào"
          }
          detail={
            search || statusFilter !== "all"
              ? "Thử thay đổi từ khóa tìm kiếm."
              : "Khám phá các khóa học đã xuất bản và bắt đầu học ngay."
          }
          action="Khám phá khóa học"
          href="/courses"
        />
      )}
    </>
  );
}

function CourseGridCard({
  course,
  progress,
  index,
}: {
  course: Enrollment;
  progress?: CourseProgress;
  index: number;
}) {
  const archived = course.courseStatus !== "PUBLISHED";
  const percent = progress?.progressPercent ?? 0;
  const tones = [
    "from-[#dff7ec] to-[#e9f6ff]",
    "from-[#fff0df] to-[#ffeadc]",
    "from-[#e9e6ff] to-[#e3f7f2]",
  ];
  return (
    <article className="group overflow-hidden rounded-xl border border-[#e4ece8] bg-white shadow-[0_2px_10px_rgba(16,26,44,.05)] transition hover:-translate-y-0.5 hover:border-[#aee4d2] hover:shadow-md">
      <div
        className={cn(
          "relative flex h-36 items-center justify-center bg-gradient-to-br",
          tones[index % tones.length],
        )}
      >
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/80 bg-white/75 text-primary shadow-sm">
          <BookOpen className="h-8 w-8" />
        </div>
        <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#66736f]">
          {archived ? "Đã lưu trữ" : "Đã ghi danh"}
        </span>
      </div>
      <div className="p-4">
        <h2 className="line-clamp-2 min-h-11 text-sm font-semibold leading-5 text-[#202d28] group-hover:text-primary">
          {course.courseTitle}
        </h2>
        <p className="mt-1 text-xs text-[#84908b]">
          Ghi danh ngày {new Intl.DateTimeFormat("vi-VN").format(new Date(course.enrolledAt))}
        </p>
        <div className="mt-4 flex items-center justify-between text-[11px] text-[#87928e]">
          <span>
            {archived
              ? "Nội dung hiện không khả dụng"
              : `${progress?.completedLessons ?? 0} / ${progress?.totalLessons ?? 0} bài học`}
          </span>
          <span className="font-semibold text-primary">{archived ? "—" : `${percent}%`}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf3f0]">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${archived ? 0 : percent}%` }}
          />
        </div>
        <Link
          href={archived ? "/courses" : `/learning/courses/${course.courseId}`}
          className="focus-ring mt-4 flex h-9 items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-white transition hover:bg-[#139b72]"
        >
          {archived ? "Tìm khóa học tương tự" : "Mở khóa học"}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function UtilityView({
  view,
}: {
  view: Exclude<PortalView, "overview" | "courses" | "savedLessons">;
}) {
  if (view === "calendar") return <CalendarView />;
  if (view === "notes") return <NotesView />;
  if (view === "assignments") return <AssignmentsView />;
  if (view === "messages") return <MessagesView />;
  if (view === "resources") return <ResourcesView />;
  const configs = {
    certificates: {
      icon: GraduationCap,
      title: "Chứng chỉ của bạn",
      copy: "Chứng chỉ hoàn thành khóa học sẽ được lưu tại đây sau khi bạn hoàn tất giáo trình.",
      action: "Xem khóa học",
      href: "/learning/courses",
    },
    assignments: {
      icon: ClipboardList,
      title: "Bài tập sẽ được đồng bộ tại đây",
      copy: "Bài tập và bài kiểm tra sẽ xuất hiện theo các khóa học bạn đang học.",
      action: "Xem khóa học",
      href: "/learning/courses",
    },
    calendar: {
      icon: CalendarDays,
      title: "Lịch học của bạn",
      copy: "Khi có buổi học hoặc hạn nộp mới, lịch học sẽ được cập nhật tại đây.",
      action: "Quay về tổng quan",
      href: "/learning",
    },
    discussion: {
      icon: MessageCircle,
      title: "Cùng trao đổi với lớp học",
      copy: "Các cuộc thảo luận sẽ hiện tại đây khi khóa học của bạn mở hoạt động nhóm.",
      action: "Xem khóa học",
      href: "/learning/courses",
    },
    resources: {
      icon: FolderClosed,
      title: "Tài liệu đã lưu",
      copy: "Lưu tài liệu trong bài học để tìm lại nhanh tại đây.",
      action: "Mở khóa học",
      href: "/learning/courses",
    },
    notes: {
      icon: NotebookPen,
      title: "Ghi lại điều bạn muốn nhớ",
      copy: "Ghi chú theo bài học sẽ được nhóm gọn để bạn xem lại bất cứ lúc nào.",
      action: "Mở khóa học",
      href: "/learning/courses",
    },
    messages: {
      icon: MessageCircle,
      title: "Tin nhắn của bạn",
      copy: "Tin nhắn từ giảng viên và nhóm học sẽ được cập nhật tại đây.",
      action: "Tìm giảng viên",
      href: "/learning/teachers",
    },
    teachers: {
      icon: GraduationCap,
      title: "Giảng viên của tôi",
      copy: "Danh sách giảng viên sẽ gắn với các khóa học bạn đã ghi danh.",
      action: "Khám phá khóa học",
      href: "/courses",
    },
    reviews: {
      icon: Sparkles,
      title: "Đánh giá của bạn",
      copy: "Sau khi học, bạn có thể chia sẻ trải nghiệm để giúp học viên khác chọn đúng khóa học.",
      action: "Xem khóa học",
      href: "/learning/courses",
    },
  };
  const config = configs[view];
  const Icon = config.icon;
  return (
    <div className="grid min-h-[420px] place-items-center rounded-2xl border border-[#e5ede9] bg-white px-5 py-12">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e8faf4] text-primary">
          <Icon className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-[#18251f]">{config.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#7d8984]">{config.copy}</p>
        <Link
          href={config.href}
          className="focus-ring mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75]"
        >
          {config.action}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function MessagesView() {
  const [openChat, setOpenChat] = useState(false);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  return (
    <section className="portal-card min-h-[calc(100vh-150px)] !p-0">
      <div className="flex items-center justify-between border-b border-[#e5e9ec] px-4 py-3">
        {openChat ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpenChat(false)}
              aria-label="Quay lại danh sách tin nhắn"
              className="focus-ring rounded p-1"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <UserAvatar name="Lê Quốc Khánh" avatarUrl={null} />
            <div>
              <h2 className="text-sm font-semibold">Lê Quốc Khánh</h2>
              <p className="text-[10px] text-[#87928d]">Giảng viên</p>
            </div>
          </div>
        ) : (
          <h2 className="text-sm font-semibold text-primary">Tin Nhắn Của Bạn</h2>
        )}
        <button
          type="button"
          aria-label="Tùy chọn tin nhắn"
          className="focus-ring rounded p-2 text-[#667085]"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
      {openChat ? (
        <div className="flex min-h-[calc(100vh-220px)] flex-col">
          <div className="flex flex-1 flex-col justify-end gap-3 px-4 py-5 md:px-6">
            <p className="mx-auto mb-2 rounded-md bg-[#f1f5f9] px-2 py-1 text-[10px]">Hôm nay</p>
            <div className="ml-auto max-w-[78%] space-y-2 text-right">
              <p className="ml-auto w-fit rounded-lg bg-primary px-3 py-2 text-xs text-white">
                Chào bạn
              </p>
              <p className="ml-auto w-fit rounded-lg bg-primary px-3 py-2 text-xs text-white">
                Mình có thể hỏi thêm về bài học trong khóa học không?
              </p>
            </div>
            <div className="max-w-[78%] rounded-lg bg-[#f1f5f9] px-3 py-2 text-xs leading-5">
              Chào bạn! Cảm ơn bạn đã liên hệ với tôi. Đừng ngần ngại hỏi bất kỳ câu hỏi nào về khóa
              học, tôi sẽ cố gắng trả lời sớm nhất có thể.
            </div>
            {sent.map((message, index) => (
              <p
                key={index}
                className="ml-auto max-w-[78%] rounded-lg bg-primary px-3 py-2 text-xs text-white"
              >
                {message}
              </p>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.trim()) {
                setSent((items) => [...items, draft.trim()]);
                setDraft("");
              }
            }}
            className="flex gap-2 border-t border-[#e5e9ec] p-3"
          >
            <label className="sr-only" htmlFor="message-draft">
              Nhập tin nhắn
            </label>
            <input
              id="message-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nhập tin nhắn..."
              className="focus-ring h-10 min-w-0 flex-1 rounded-md border border-[#e5e9ec] px-3 text-xs"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Gửi tin nhắn"
              className="focus-ring grid h-10 w-12 place-items-center rounded-md bg-[#101a2c] text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="flex h-9 w-full max-w-[300px] items-center gap-2 rounded-md border border-[#e5e9ec] px-2">
              <Search className="h-4 w-4 text-primary" />
              <input
                aria-label="Tìm kiếm tin nhắn"
                placeholder="Tìm kiếm tin nhắn..."
                className="min-w-0 flex-1 text-xs outline-none"
              />
            </label>
            <div className="ml-auto flex items-center gap-2 text-xs">
              Xếp theo{" "}
              <button className="focus-ring flex h-9 items-center gap-2 rounded-md border border-primary px-3">
                Mới nhất <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button className="focus-ring flex h-9 items-center gap-2 rounded-md border border-primary px-3">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Lọc
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpenChat(true)}
            className="focus-ring w-full rounded-xl border border-[#e5e9ec] p-3 text-left transition hover:bg-[#f8fcfa]"
          >
            <div className="flex items-center gap-2">
              <UserAvatar name="Lê Quốc Khánh" avatarUrl={null} />
              <span className="text-sm font-semibold">Lê Quốc Khánh</span>
              <time className="ml-auto text-[10px] text-[#667085]">30 thg 4, 2026</time>
            </div>
            <p className="mt-3 truncate text-xs">
              Cảm ơn bạn đã thắc mắc, tôi sẽ gửi cho bạn một file PDF giải đáp các vấn đề bạn đang
              gặp phải.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setOpenChat(true)}
            className="focus-ring mt-2 w-full rounded-xl border border-[#e5e9ec] p-3 text-left transition hover:bg-[#f8fcfa]"
          >
            <div className="flex items-center gap-2">
              <UserAvatar name="Thầy Hoàng Văn Dũng" avatarUrl={null} />
              <span className="text-sm font-semibold">Thầy Hoàng Văn Dũng</span>
              <time className="ml-auto text-[10px] text-[#667085]">10:23 Thứ 2, 22 thg 6</time>
            </div>
            <p className="mt-3 truncate text-xs">bên kia họ sẽ báo.</p>
          </button>
        </div>
      )}
    </section>
  );
}

function ResourcesView() {
  const [query, setQuery] = useState("");
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-base font-semibold text-primary">
          Tài liệu của tôi <span className="text-xs">(0)</span>
        </h1>
        <label className="ml-auto flex h-9 w-full max-w-[300px] items-center gap-2 rounded-md border border-[#dce8e3] bg-white px-2">
          <span className="sr-only">Tìm kiếm tài liệu</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kiếm khóa học..."
            className="min-w-0 flex-1 text-xs outline-none"
          />
          <Search className="h-4 w-4 text-primary" />
        </label>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-2">
          Khóa học:
          <select className="focus-ring h-9 w-[205px] rounded-md border border-[#dce8e3] bg-white px-2">
            <option>Tất cả</option>
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className="focus-ring flex h-9 items-center gap-2 rounded-md border border-primary px-3"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Xếp theo
          </button>
          <button
            type="button"
            className="focus-ring flex h-9 items-center gap-2 rounded-md border border-primary px-3"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Lọc
          </button>
        </div>
      </div>
      <section className="portal-card grid min-h-[300px] place-items-center text-center">
        <div>
          <FolderClosed className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 text-sm font-semibold">Chưa có tài liệu đã lưu</h2>
          <p className="mt-1 max-w-sm text-xs leading-5 text-[#87928d]">
            Tài liệu bạn lưu từ các bài học sẽ xuất hiện tại đây.
          </p>
          <Link
            href="/learning/courses"
            className="focus-ring mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-white"
          >
            <BookOpen className="h-4 w-4" /> Mở khóa học
          </Link>
        </div>
      </section>
    </div>
  );
}

function AssignmentsView() {
  const { getAccessToken } = useAuthSession();
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "upcoming" | "overdue">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setAssignments(await fetchMyAssignments(token));
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể tải danh sách bài tập.",
      );
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadAssignments(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAssignments]);
  const visibleAssignments = assignments.filter((item) => {
    const matchesStatus =
      filter === "all" || (filter === "todo" ? !item.submittedAt : Boolean(item.submittedAt));
    const overdue = Boolean(item.dueAt && new Date(item.dueAt) < new Date() && !item.submittedAt);
    const matchesDate = dateFilter === "all" || (dateFilter === "overdue" ? overdue : !overdue);
    const query = searchQuery.trim().toLocaleLowerCase("vi");
    return (
      matchesStatus &&
      matchesDate &&
      (!query || `${item.title} ${item.courseTitle}`.toLocaleLowerCase("vi").includes(query))
    );
  });
  async function saveSubmission(assignment: Assignment) {
    if (!responseText.trim()) {
      setMessage("Nhập nội dung bài làm trước khi nộp.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await submitAssignment(token, assignment.id, responseText.trim());
      setMessage("Bài làm đã được nộp.");
      setActiveId(null);
      await loadAssignments();
    } catch (reason) {
      setError(reason instanceof ApiClientError ? reason.message : "Không thể nộp bài lúc này.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-9 w-full max-w-[310px] items-center gap-2 rounded-md border border-[#e5e9ec] bg-white px-2">
          <Search className="h-4 w-4 text-[#8d969b]" />
          <span className="sr-only">Tìm bài tập</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm kiếm bài tập..."
            className="min-w-0 flex-1 text-xs outline-none"
          />
        </label>
        <div className="ml-auto flex items-center gap-2 text-xs text-[#727272]">
          Lọc theo{" "}
          <select
            aria-label="Lọc ngày hết hạn"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)}
            className="focus-ring h-9 rounded-md border border-[#dce8e3] bg-white px-2"
          >
            <option value="all">Mọi ngày</option>
            <option value="upcoming">Còn hạn</option>
            <option value="overdue">Quá hạn</option>
          </select>
          <select
            aria-label="Lọc trạng thái bài tập"
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            className="focus-ring h-9 rounded-md border border-[#dce8e3] bg-white px-2"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="todo">Cần hoàn thành</option>
            <option value="done">Đã hoàn thành</option>
          </select>
        </div>
      </div>
      <section className="overflow-hidden rounded-lg border border-[#e5e9ec] bg-white">
        {message && (
          <p role="status" className="mt-4 text-sm text-primary">
            {message}
          </p>
        )}
        {error && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2">
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadAssignments()}
              className="focus-ring rounded-md px-2 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
              Thử tải lại
            </button>
          </div>
        )}
        {loading ? (
          <p className="p-6 text-sm text-[#87928d]">Đang tải bài tập…</p>
        ) : visibleAssignments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-xs">
              <thead className="bg-[#fafafa] text-[#079367]">
                <tr>
                  {[
                    "Tên bài tập",
                    "Khóa học",
                    "Chương",
                    "Ngày hết hạn",
                    "Trạng thái",
                    "Bài nộp",
                  ].map((label) => (
                    <th key={label} className="border-b border-[#e5e7eb] px-3 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f2]">
                {visibleAssignments.map((assignment) => {
                  const overdue =
                    !assignment.submittedAt &&
                    Boolean(assignment.dueAt && new Date(assignment.dueAt) < new Date());
                  return (
                    <Fragment key={assignment.id}>
                      <tr className="hover:bg-[#fcfefd]">
                        <td className="max-w-[190px] truncate px-3 py-3 font-medium text-[#222]">
                          {assignment.title}
                        </td>
                        <td className="max-w-[170px] truncate px-3 py-3 text-[#727272]">
                          {assignment.courseTitle}
                        </td>
                        <td className="max-w-[170px] truncate px-3 py-3 text-[#727272]">
                          {assignment.description?.split(/[.!?]/)[0] || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[#727272]">
                          {assignment.dueAt
                            ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
                                new Date(assignment.dueAt),
                              )
                            : "Không giới hạn"}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "inline-flex whitespace-nowrap items-center rounded-full px-2 py-1 text-[10px]",
                              assignment.submittedAt
                                ? "bg-emerald-50 text-emerald-700"
                                : overdue
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-blue-50 text-blue-600",
                            )}
                          >
                            {assignment.submittedAt
                              ? "● Đã nộp"
                              : overdue
                                ? "● Quá hạn"
                                : "● Đang thực hiện"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {overdue ? (
                            <span className="text-[#cbd2d8]">Không thể nộp</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setResponseText(assignment.responseText ?? "");
                                setActiveId(activeId === assignment.id ? null : assignment.id);
                                setMessage("");
                              }}
                              className="focus-ring rounded px-1 font-medium text-primary hover:underline"
                            >
                              {assignment.submittedAt ? "Đã nộp" : "Nộp bài"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {activeId === assignment.id && (
                        <tr>
                          <td colSpan={6} className="bg-[#fcfefd] p-4">
                            {assignment.feedback && (
                              <p className="mt-3 rounded-lg bg-[#f6f9f7] p-3 text-sm text-[#47534e]">
                                Nhận xét: {assignment.feedback}
                              </p>
                            )}
                            {!assignment.submittedAt ? (
                              <div className="mt-4 space-y-3">
                                <label className="block text-xs font-medium text-[#47534e]">
                                  Bài làm
                                  <textarea
                                    value={responseText}
                                    onChange={(event) => setResponseText(event.target.value)}
                                    maxLength={50000}
                                    rows={5}
                                    className="focus-ring mt-1.5 w-full rounded-lg border border-[#dfe8e3] p-3 text-sm"
                                    placeholder="Nhập câu trả lời của bạn"
                                  />
                                </label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => void saveSubmission(assignment)}
                                    className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                  >
                                    {saving ? "Đang nộp…" : "Nộp bài"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveId(null)}
                                    className="focus-ring rounded-lg border px-4 py-2 text-sm"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm">
                                <p>{assignment.description}</p>
                                <p className="mt-2">
                                  Điểm tối đa: {assignment.maxScore}
                                  {assignment.score !== null && ` · Điểm: ${assignment.score}`}
                                </p>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-lg bg-[#f8fbf9] p-7 text-center">
            <Check className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-sm font-medium text-[#47534e]">
              {filter === "done"
                ? "Chưa có bài đã nộp"
                : filter === "todo"
                  ? "Bạn đã hoàn thành các bài tập"
                  : "Chưa có bài tập"}
            </p>
            <p className="mt-1 text-xs text-[#87928d]">
              Bài tập đã xuất bản trong khóa học của bạn sẽ hiển thị tại đây.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function CalendarView() {
  const { getAccessToken } = useAuthSession();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"month" | "week" | "day">("month");
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthDays = new Date(year, month + 1, 0).getDate();
  const weekStart = new Date(selected);
  weekStart.setDate(selected.getDate() - selected.getDay());
  const cells =
    calendarMode === "day"
      ? [selected.getDate()]
      : calendarMode === "week"
        ? Array.from({ length: 7 }, (_, index) => weekStart.getDate() + index)
        : Array.from({ length: 42 }, (_, index) => index - firstWeekday + 1);
  const title = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(
    monthDate,
  );
  const selectedLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(selected);
  useEffect(() => {
    let active = true;
    async function loadEvents() {
      setLoading(true);
      setError("");
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        const result = await fetchCalendarEvents(
          token,
          new Date(year, month, 1),
          new Date(year, month + 1, 1),
        );
        if (active) setEvents(result.filter((event) => event.status !== "CANCELLED"));
      } catch (reason) {
        if (active)
          setError(
            reason instanceof ApiClientError ? reason.message : "Không thể tải lịch học lúc này.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadEvents();
    return () => {
      active = false;
    };
  }, [getAccessToken, month, year]);
  const selectedEvents = events.filter(
    (event) => new Date(event.startsAt).toDateString() === selected.toDateString(),
  );
  function openNewEvent() {
    const start = new Date(selected);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    setEditingEventId(null);
    setEventTitle("");
    setEventDescription("");
    setEventStart(toLocalDateTimeInput(start));
    setEventEnd(toLocalDateTimeInput(end));
    setError("");
    setEventFormOpen(true);
  }
  function openEditEvent(event: CalendarEvent) {
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventDescription(event.description ?? "");
    setEventStart(toLocalDateTimeInput(new Date(event.startsAt)));
    setEventEnd(toLocalDateTimeInput(new Date(event.endsAt)));
    setError("");
    setEventFormOpen(true);
  }
  async function saveEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!eventStart || !eventEnd || new Date(eventEnd) <= new Date(eventStart)) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }
    setSavingEvent(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const payload = {
        title: eventTitle.trim(),
        description: eventDescription.trim() || null,
        startsAt: new Date(eventStart).toISOString(),
        endsAt: new Date(eventEnd).toISOString(),
      };
      const saved = editingEventId
        ? await updateCalendarEvent(token, editingEventId, payload)
        : await createCalendarEvent(token, payload);
      setEvents((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setSelected(new Date(saved.startsAt));
      setMonthDate(new Date(saved.startsAt));
      setEventFormOpen(false);
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể lưu sự kiện lúc này.",
      );
    } finally {
      setSavingEvent(false);
    }
  }
  async function removeEvent(eventId: string) {
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await deleteCalendarEvent(token, eventId);
      setEvents((current) => current.filter((event) => event.id !== eventId));
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể xóa sự kiện lúc này.",
      );
    }
  }
  function shiftMonth(delta: number) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }
  return (
    <div className="grid items-start gap-4">
      <section className="rounded-xl border border-[#e5ede9] bg-white p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e9ec] pb-3">
          <h1 className="text-base font-semibold text-primary">Thời khóa biểu</h1>
          <div className="flex items-center gap-1 text-xs">
            {(["Tháng", "Tuần", "Ngày"] as const).map((label) => {
              const mode = label === "Tháng" ? "month" : label === "Tuần" ? "week" : "day";
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCalendarMode(mode)}
                  aria-pressed={calendarMode === mode}
                  className={cn(
                    "focus-ring h-9 border-b-2 px-3",
                    calendarMode === mode
                      ? "border-primary font-medium text-primary"
                      : "border-transparent text-[#667085]",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-md border border-primary px-3 text-xs text-primary"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Lọc
            </button>
            <button
              type="button"
              onClick={openNewEvent}
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-[#079367] px-3 text-xs font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm sự kiện
            </button>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="mr-1 text-sm font-medium capitalize text-[#079367]">{title}</h2>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md bg-[#f2f5f3] hover:bg-[#e8f8f2]"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              setMonthDate(today);
              setSelected(today);
            }}
            className="focus-ring h-8 rounded-md bg-[#079367] px-3 text-xs font-medium text-white"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md bg-[#f2f5f3] hover:bg-[#e8f8f2]"
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="ml-auto" />
          <div className="hidden">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-[#e6ece9] hover:bg-[#effaf5]"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setMonthDate(today);
                setSelected(today);
              }}
              className="focus-ring rounded-lg border border-[#e6ece9] px-3 text-xs font-medium hover:bg-[#effaf5]"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-[#e6ece9] hover:bg-[#effaf5]"
              aria-label="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 overflow-hidden rounded-t-md border border-b-0 border-[#e5e7eb] text-center text-[10px] font-semibold text-[#079367]">
          {["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"].map((day) => (
            <span key={day} className="bg-[#fafafa] py-2">
              {day}
            </span>
          ))}
        </div>
        <div
          className={cn(
            "overflow-hidden rounded-b-md border-l border-t border-[#e5e7eb]",
            calendarMode === "day" ? "grid grid-cols-1" : "grid grid-cols-7",
          )}
        >
          {cells.map((day, index) => {
            const date =
              calendarMode === "day"
                ? new Date(selected)
                : calendarMode === "week"
                  ? new Date(
                      weekStart.getFullYear(),
                      weekStart.getMonth(),
                      weekStart.getDate() + index,
                    )
                  : new Date(year, month, day);
            const inMonth = calendarMode !== "month" || (day > 0 && day <= monthDays);
            const isSelected = inMonth && selected.toDateString() === date.toDateString();
            const isToday = inMonth && new Date().toDateString() === date.toDateString();
            return (
              <button
                key={index}
                disabled={!inMonth}
                onClick={() => setSelected(date)}
                className={cn(
                  "focus-ring flex min-h-[92px] flex-col items-stretch border-b border-r border-[#e5e7eb] p-2 text-left text-xs transition md:min-h-[112px]",
                  !inMonth && "text-[#b0b5b8]",
                  isSelected && "bg-[#f0fbf7]",
                  !isSelected && isToday && "bg-[#fbfefc]",
                  !isSelected && !isToday && "hover:bg-[#fbfefc]",
                )}
              >
                <span
                  className={cn(
                    "mb-1 grid h-5 w-5 place-items-center rounded-full",
                    isToday && "bg-primary font-semibold text-white",
                  )}
                >
                  {date.getDate()}
                </span>
                <span className="space-y-1">
                  {events
                    .filter(
                      (event) => new Date(event.startsAt).toDateString() === date.toDateString(),
                    )
                    .slice(0, 2)
                    .map((event, eventIndex) => (
                      <span
                        key={event.id}
                        className={cn(
                          "block truncate rounded-sm px-1 py-0.5 text-[9px] leading-3",
                          [
                            "bg-rose-50 text-rose-600",
                            "bg-amber-50 text-amber-700",
                            "bg-emerald-50 text-emerald-700",
                            "bg-purple-50 text-purple-700",
                          ][eventIndex % 4],
                        )}
                      >
                        {event.title}
                      </span>
                    ))}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={openNewEvent}
          className="focus-ring mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75]"
        >
          <Plus className="h-4 w-4" /> Thêm sự kiện
        </button>
      </section>
      <aside className="rounded-xl border border-[#e5ede9] bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8faf4] text-primary">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Lịch trong ngày</h2>
            <p className="mt-1 text-xs capitalize text-[#87928d]">{selectedLabel}</p>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-600">
            {error}
          </p>
        )}
        {loading ? (
          <p className="mt-5 text-sm text-[#87928d]">Đang tải lịch…</p>
        ) : selectedEvents.length ? (
          <ul className="mt-5 space-y-3">
            {selectedEvents.map((event) => (
              <li key={event.id} className="rounded-lg border border-[#e8eeeb] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#34413c]">{event.title}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditEvent(event)}
                      className="focus-ring text-xs text-primary"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeEvent(event.id)}
                      className="focus-ring text-xs text-rose-600"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-[#77837e]">
                  {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(
                    new Date(event.startsAt),
                  )}
                </p>
                {event.description && (
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#77837e]">
                    {event.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 rounded-lg bg-[#f8fbf9] px-4 py-8 text-center">
            <p className="text-sm font-medium text-[#47534e]">Chưa có sự kiện</p>
            <p className="mt-1 text-xs leading-5 text-[#87928d]">
              Các sự kiện lịch cá nhân sẽ xuất hiện tại đây.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={openNewEvent}
          className="focus-ring mt-4 w-full rounded-lg border border-[#dfe8e3] px-3 py-2 text-xs font-semibold text-primary hover:bg-[#effaf5]"
        >
          Thêm sự kiện trong ngày
        </button>
        <Link
          href="/learning/courses"
          className="focus-ring mt-4 inline-flex text-xs font-semibold text-primary hover:underline"
        >
          Xem khóa học của tôi
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </aside>
      {eventFormOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#101a2c]/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEventFormOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-event-title"
            onSubmit={saveEvent}
            className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-xl md:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 id="calendar-event-title" className="text-lg font-semibold text-[#101a2c]">
                {editingEventId ? "Sửa sự kiện" : "Thêm sự kiện"}
              </h2>
              <button
                type="button"
                onClick={() => setEventFormOpen(false)}
                aria-label="Đóng"
                className="focus-ring rounded-lg p-2 hover:bg-[#f3f7f5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-sm font-medium">
              Tiêu đề
              <input
                required
                maxLength={200}
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#dfe8e3] px-3"
              />
            </label>
            <label className="block text-sm font-medium">
              Mô tả
              <textarea
                maxLength={10000}
                rows={3}
                value={eventDescription}
                onChange={(event) => setEventDescription(event.target.value)}
                className="focus-ring mt-1.5 w-full rounded-lg border border-[#dfe8e3] p-3"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Bắt đầu
                <input
                  required
                  type="datetime-local"
                  value={eventStart}
                  onChange={(event) => setEventStart(event.target.value)}
                  className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#dfe8e3] px-2"
                />
              </label>
              <label className="block text-sm font-medium">
                Kết thúc
                <input
                  required
                  type="datetime-local"
                  value={eventEnd}
                  onChange={(event) => setEventEnd(event.target.value)}
                  className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#dfe8e3] px-2"
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="text-sm text-rose-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEventFormOpen(false)}
                className="focus-ring rounded-lg border border-[#dfe8e3] px-4 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingEvent}
                className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingEvent ? "Đang lưu…" : "Lưu sự kiện"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function toLocalDateTimeInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function NotesView() {
  const { getAccessToken } = useAuthSession();
  const [notes, setNotes] = useState<LearningNote[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const result = await fetchMyNotes(token);
      setNotes(result.data);
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể tải ghi chú lúc này.",
      );
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadNotes(), 0);
    return () => window.clearTimeout(timer);
  }, [loadNotes]);

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setMessage("Nhập tiêu đề và nội dung ghi chú.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const input = { title: title.trim(), content: body.trim() };
      if (editingId) await updateLearningNote(token, editingId, input);
      else await createLearningNote(token, input);
      setTitle("");
      setBody("");
      setEditingId(null);
      setShowEditor(false);
      setMessage(
        editingId ? "Ghi chú đã được cập nhật." : "Ghi chú đã được lưu trên tài khoản của bạn.",
      );
      await loadNotes();
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể lưu ghi chú lúc này.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(id: string) {
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await deleteLearningNote(token, id);
      if (editingId === id) {
        setEditingId(null);
        setShowEditor(false);
        setTitle("");
        setBody("");
      }
      await loadNotes();
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể xóa ghi chú lúc này.",
      );
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-primary">Ghi chú</h1>
        <div className="flex gap-2">
          <button
            type="button"
            className="focus-ring flex h-9 items-center gap-2 rounded-md border border-primary px-3 text-xs text-primary"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Xếp theo
          </button>
          <button
            type="button"
            className="focus-ring flex h-9 items-center gap-2 rounded-md border border-primary px-3 text-xs text-primary"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Lọc
          </button>
          <button
            type="button"
            onClick={() => setShowEditor(true)}
            className="focus-ring flex h-9 items-center gap-2 rounded-md bg-[#079367] px-3 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm ghi chú
          </button>
        </div>
      </div>
      {(showEditor || editingId) && (
        <section className="rounded-xl border border-[#e5ede9] bg-white p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-primary">GHI CHÚ CỦA TÔI</p>
              <h2 className="mt-1 text-lg font-semibold">Điều bạn muốn nhớ</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowEditor(false);
                setEditingId(null);
              }}
              aria-label="Đóng biểu mẫu"
              className="focus-ring rounded-md p-2 text-[#667085]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={saveNote} className="mt-5 space-y-3">
            <label className="block text-xs font-medium text-[#47534e]">
              Tiêu đề
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                placeholder="Ví dụ: Những điểm cần nhớ"
                className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#dfe8e3] px-3 text-sm outline-none placeholder:text-[#a0aaa6]"
              />
            </label>
            <label className="block text-xs font-medium text-[#47534e]">
              Nội dung
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={5000}
                rows={5}
                placeholder="Viết ghi chú của bạn..."
                className="focus-ring mt-1.5 w-full resize-y rounded-lg border border-[#dfe8e3] px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-[#a0aaa6]"
              />
            </label>
            {message && (
              <p role="status" className="text-xs text-primary">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="text-xs text-rose-600">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                disabled={saving}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {saving ? "Đang lưu…" : editingId ? "Cập nhật ghi chú" : "Lưu ghi chú"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setTitle("");
                    setBody("");
                    setShowEditor(false);
                  }}
                  className="focus-ring h-10 rounded-lg border border-[#dfe8e3] px-4 text-sm"
                >
                  Hủy
                </button>
              )}
            </div>
          </form>
        </section>
      )}
      <section className="rounded-xl border border-[#e5ede9] bg-white p-5 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Ghi chú gần đây</h2>
          <span className="text-xs text-[#87928d]">{notes.length}</span>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-[#87928d]">Đang tải ghi chú…</p>
        ) : notes.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="flex min-h-[145px] flex-col rounded-md border border-[#e5e7eb] bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-semibold text-[#222]">{note.title}</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(note.id);
                        setShowEditor(true);
                        setTitle(note.title);
                        setBody(note.content);
                        setMessage("");
                      }}
                      aria-label={`Sửa ghi chú ${note.title}`}
                      className="focus-ring rounded px-1 text-xs text-primary hover:bg-[#effaf5]"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNote(note.id)}
                      aria-label={`Xóa ghi chú ${note.title}`}
                      className="focus-ring rounded px-1 text-xs text-rose-600 hover:bg-rose-50"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
                <p className="mt-2 flex-1 line-clamp-4 whitespace-pre-wrap text-[11px] leading-5 text-[#777]">
                  {note.content}
                </p>
                <time className="mt-3 block border-t border-[#edf0f2] pt-2 text-center text-[10px] text-[#777]">
                  {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
                    new Date(note.updatedAt),
                  )}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-lg bg-[#f8fbf9] p-6 text-center">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium">Chưa có ghi chú</p>
            <p className="mt-1 text-xs leading-5 text-[#87928d]">
              Ghi chú của bạn được đồng bộ qua tài khoản học tập.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
