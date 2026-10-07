"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BookmarkCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  Clock,
  Flame,
  FolderClosed,
  FileText,
  GraduationCap,
  Home,
  House,
  LayoutDashboard,
  Menu,
  MessageCircle,
  NotebookPen,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
  Send,
  MoreHorizontal,
  SlidersHorizontal,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserMenu } from "@/components/layout/user-menu";
import { PortalBrand } from "@/components/layout/portal-brand";
import { ApiClientError } from "@/lib/api";
import { fetchInstructorCourses, type InstructorCourse } from "@/lib/instructor-course-client";
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
    title: "KHÔNG GIAN HỌC",
    links: [
      { label: "Tổng quan", href: "/learning", view: "overview" as const, icon: Home },
      {
        label: "Khóa học của tôi",
        href: "/learning/courses",
        view: "courses" as const,
        icon: BookOpen,
      },
      {
        label: "Thời khóa biểu",
        href: "/learning/calendar",
        view: "calendar" as const,
        icon: CalendarDays,
      },
    ],
  },
  {
    title: "TƯƠNG TÁC & BÀI TẬP",
    links: [
      {
        label: "Bài tập",
        href: "/learning/assignments",
        view: "assignments" as const,
        icon: ClipboardList,
      },
      {
        label: "Thảo luận",
        href: "/learning/discussion",
        view: "discussion" as const,
        icon: MessageCircle,
      },
    ],
  },
  {
    title: "LƯU TRỮ & THÀNH TÍCH",
    links: [
      {
        label: "Bài học đã lưu",
        href: "/learning/saved-lessons",
        view: "savedLessons" as const,
        icon: BookmarkCheck,
      },
      { label: "Ghi chú", href: "/learning/notes", view: "notes" as const, icon: NotebookPen },
      {
        label: "Tài liệu",
        href: "/learning/resources",
        view: "resources" as const,
        icon: FolderClosed,
      },
      {
        label: "Chứng chỉ của tôi",
        href: "/learning/certificates",
        view: "certificates" as const,
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

interface LearningDataCache {
  userId: string;
  enrollments: Enrollment[];
  progressByCourse: Record<string, CourseProgress>;
  instructorCourses: InstructorCourse[];
  timestamp: number;
}

let learningDataCache: LearningDataCache | null = null;

export function resetLearningPortalCache() {
  learningDataCache = null;
}

export function LearningPortal({ view }: { view: PortalView }) {
  const { user, isLoading, getAccessToken } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const isInstructor = Boolean(
    user?.roles?.some((r) => r === "INSTRUCTOR" || r === "ROLE_INSTRUCTOR"),
  );

  const isDataView = view === "overview" || view === "courses";
  const hasValidCache = Boolean(learningDataCache && user && learningDataCache.userId === user.id);

  const [enrollments, setEnrollments] = useState<Enrollment[]>(() =>
    hasValidCache ? learningDataCache!.enrollments : [],
  );
  const [progressByCourse, setProgressByCourse] = useState<Record<string, CourseProgress>>(() =>
    hasValidCache ? learningDataCache!.progressByCourse : {},
  );
  const [instructorCourses, setInstructorCourses] = useState<InstructorCourse[]>(() =>
    hasValidCache ? learningDataCache!.instructorCourses : [],
  );
  const [instructorCoursesLoading, setInstructorCoursesLoading] = useState(false);
  const [instructorTab, setInstructorTab] = useState<"teaching" | "learning">("teaching");
  const [loading, setLoading] = useState(() => {
    if (!isDataView) return false;
    return !hasValidCache;
  });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!isDataView) {
      setError("");
      setLoading(false);
      return;
    }
    let active = true;
    void getAccessToken()
      .then(async (token) => {
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

        let fetchedInstructorCourses: InstructorCourse[] = [];
        if (isInstructor) {
          if (!hasValidCache) {
            setInstructorCoursesLoading(true);
          }
          try {
            const instPage = await fetchInstructorCourses(token);
            if (active) {
              fetchedInstructorCourses = instPage.data;
              setInstructorCourses(instPage.data);
            }
          } catch {
            // Non-critical if instructor course fetch fails
          } finally {
            if (active) setInstructorCoursesLoading(false);
          }
        }

        try {
          const page = await fetchMyEnrollments(token);
          if (!active) return;
          const courseList = page.data ?? [];
          setEnrollments(courseList);
          const entries = await Promise.all(
            courseList
              .filter((item) => item.courseStatus === "PUBLISHED")
              .map(async (item) => {
                try {
                  return [item.courseId, await fetchCourseProgress(token, item.courseId)] as const;
                } catch {
                  return null;
                }
              }),
          );
          if (active) {
            const nextProgress = Object.fromEntries(entries.filter((item) => item !== null));
            setProgressByCourse(nextProgress);
            learningDataCache = {
              userId: user.id,
              enrollments: page.data,
              progressByCourse: nextProgress,
              instructorCourses:
                fetchedInstructorCourses.length > 0
                  ? fetchedInstructorCourses
                  : (learningDataCache?.instructorCourses ?? []),
              timestamp: Date.now(),
            };
          }
        } catch (fetchErr) {
          if (
            isInstructor &&
            fetchErr instanceof ApiClientError &&
            (fetchErr.status === 403 || fetchErr.code === "STUDENT_REQUIRED")
          ) {
            // Instructor does not have student enrollments; treat as 0 enrolled courses
            if (active) {
              setEnrollments([]);
              setProgressByCourse({});
              learningDataCache = {
                userId: user.id,
                enrollments: [],
                progressByCourse: {},
                instructorCourses:
                  fetchedInstructorCourses.length > 0
                    ? fetchedInstructorCourses
                    : (learningDataCache?.instructorCourses ?? []),
                timestamp: Date.now(),
              };
            }
            return;
          }
          throw fetchErr;
        }
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
  }, [getAccessToken, hasValidCache, isDataView, isInstructor, isLoading, pathname, router, user]);

  const visibleCourses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    return enrollments.filter(
      (item) => !query || item.courseTitle.toLocaleLowerCase("vi").includes(query),
    );
  }, [enrollments, search]);
  return (
    <div className="learning-app min-h-screen bg-[#f8fafc] text-ink lg:flex">
      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-[#101a2c]/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "learning-sidebar fixed inset-y-0 left-0 z-50 flex w-[261px] shrink-0 flex-col border-r border-slate-200/90 bg-white text-slate-800 shadow-[1px_0_3px_rgba(0,0,0,0.02)] transition-transform duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Mobile Header in Drawer */}
        <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-100 px-4 lg:hidden">
          <PortalBrand
            roleLabel={isInstructor ? "Giảng viên" : "Học viên"}
            onNavigate={() => setMobileNavOpen(false)}
          />
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Đóng menu"
            className="focus-ring rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop Header in Sidebar */}
        <div className="hidden h-[83px] shrink-0 items-center justify-between border-b border-slate-100 px-5 lg:flex">
          <PortalBrand roleLabel={isInstructor ? "Giảng viên" : "Học viên"} />
        </div>

        {/* Navigation Items (Scrollable area) */}
        <nav
          aria-label="Điều hướng học tập"
          className="flex-1 overflow-y-auto space-y-5 px-3 py-4 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300"
        >
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 pb-1 text-[10px] font-bold tracking-[.12em] text-slate-400 uppercase">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.links.map((item) => {
                  const Icon = item.icon;
                  const selected =
                    item.view === view || (view === "messages" && item.view === "discussion");
                  const count =
                    item.view === "courses"
                      ? isInstructor
                        ? instructorCourses.length
                        : enrollments.length
                      : undefined;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        aria-current={selected ? "page" : undefined}
                        className={cn(
                          "group relative focus-ring flex h-9.5 items-center gap-2.5 rounded-xl px-3 text-xs transition-all active:scale-[0.98]",
                          selected
                            ? "bg-emerald-50/90 font-semibold text-emerald-800 border border-emerald-200/80 shadow-xs shadow-emerald-950/5"
                            : "font-medium text-slate-600 hover:bg-slate-100/70 hover:text-heading",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors stroke-[1.8]",
                            selected
                              ? "text-primary stroke-[2]"
                              : "text-slate-400 group-hover:text-slate-700",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {count !== undefined && count > 0 && (
                          <span
                            className={cn(
                              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums transition-colors",
                              selected
                                ? "bg-emerald-100/90 text-emerald-800 border border-emerald-200/70"
                                : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-700",
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Instructor Quick Hub mini card */}
          {isInstructor && (
            <div className="mx-0.5 mt-2 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Giảng viên Hub
                </span>
                <span className="rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200/60 tabular-nums">
                  {instructorCourses.length} khóa
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted leading-snug">
                Quản lý khóa học & giáo trình
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <Link
                  href="/instructor"
                  className="focus-ring flex-1 inline-flex h-7.5 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-[11px] font-semibold text-white shadow-xs shadow-primary/20 hover:bg-primary-dark transition active:scale-[0.98]"
                >
                  <LayoutDashboard className="h-3 w-3" />
                  <span>Bảng điều khiển</span>
                </Link>
                <Link
                  href="/instructor/courses/overview"
                  title="Tạo khóa học mới"
                  className="focus-ring inline-flex h-7.5 w-7.5 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:border-emerald-300 hover:text-primary shadow-2xs transition active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto border-t border-slate-100 p-3 space-y-1">
          <Link
            href="/"
            onClick={() => setMobileNavOpen(false)}
            className="focus-ring flex h-9 items-center gap-2.5 rounded-xl px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-heading active:scale-[0.98]"
          >
            <House className="h-4 w-4 stroke-[1.8]" />
            <span>Về trang chủ</span>
          </Link>
          <Link
            href="/profile"
            onClick={() => setMobileNavOpen(false)}
            className="focus-ring flex h-9 items-center gap-2.5 rounded-xl px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-heading active:scale-[0.98]"
          >
            <Settings className="h-4 w-4 stroke-[1.8]" />
            <span>Cài đặt tài khoản</span>
          </Link>
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
              aria-label="Mở menu học tập"
            >
              <Menu className="h-5 w-5" />
            </button>
            <label className="hidden h-11 w-[367px] items-center gap-2 rounded-lg border border-[#b7e4d7] bg-white px-3 sm:flex">
              <Search className="h-4 w-4 text-[#94a39e]" />
              <span className="sr-only">Tìm kiếm</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-xs outline-none placeholder:text-[#98a39e]"
                placeholder="Tìm kiếm khóa học..."
              />
            </label>
            <span className="text-sm font-bold text-slate-800 lg:hidden">{viewTitles[view]}</span>
          </div>
          <div className="flex items-center gap-3">
            {isInstructor ? (
              <Link
                href="/instructor"
                className="focus-ring hidden items-center gap-1.5 rounded-lg border border-[#b7e4d7] bg-[#f0fbf7] px-3 py-2 text-xs font-semibold text-[#079367] transition hover:bg-[#dff5ec] sm:inline-flex"
              >
                <GraduationCap className="h-4 w-4" />
                Khu vực Giảng viên
              </Link>
            ) : null}
            <UserMenu showNameTrigger />
          </div>
        </header>

        <main className="learning-main mx-auto min-h-[calc(100vh-83px)] w-full max-w-[1440px] px-4 py-6 md:px-7 md:py-8 flex-1">
          <div
            className={cn(
              "mb-5 flex items-center justify-between gap-4",
              (view === "overview" ||
                view === "calendar" ||
                view === "messages" ||
                view === "courses") &&
                "sr-only",
            )}
          >
            <div>
              <h1 className="text-xl font-bold tracking-tight text-heading md:text-2xl">
                {view === "assignments" ? "Bài tập" : viewTitles[view]}
              </h1>
              {view === "assignments" && (
                <p className="mt-1 text-sm text-muted">
                  Xem và quản lý bài tập trong khóa học của bạn
                </p>
              )}
            </div>
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
              isInstructor={isInstructor}
            />
          ) : view === "courses" ? (
            <MyCourses
              courses={visibleCourses}
              progress={progressByCourse}
              search={search}
              onSearch={setSearch}
              isInstructor={isInstructor}
              instructorCourses={instructorCourses}
              instructorCoursesLoading={instructorCoursesLoading}
              instructorTab={instructorTab}
              onInstructorTabChange={setInstructorTab}
            />
          ) : view === "savedLessons" ? (
            <SavedLessonsView />
          ) : view === "certificates" ? (
            <CertificateListView />
          ) : (
            <UtilityView view={view} />
          )}
        </main>
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
  isInstructor = false,
}: {
  userName: string;
  enrollments: Enrollment[];
  progress: Record<string, CourseProgress>;
  isInstructor?: boolean;
}) {
  const { getAccessToken } = useAuthSession();
  const [tasks, setTasks] = useState(upcomingTasks);
  const [instructorBannerDismissed, setInstructorBannerDismissed] = useState(false);
  const [activityMetric, setActivityMetric] = useState<"hours" | "lessons">("hours");
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const recent = enrollments.slice(0, 3);
  const primaryCourse = recent[0];
  const primaryProgress = primaryCourse ? progress[primaryCourse.courseId] : undefined;

  const totalCompleted = Object.values(progress).reduce(
    (sum, item) => sum + item.completedLessons,
    0,
  );
  const totalLessons = Object.values(progress).reduce((sum, item) => sum + item.totalLessons, 0);
  const completion = totalLessons ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  // Calendar setup with primitive values for React Compiler safety
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentDay = new Date().getDate();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstWeekday = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  const days = Array.from({ length: totalDaysInMonth }, (_, index) => index + 1);
  const monthName = new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(new Date(currentYear, currentMonth, 1));

  // Fetch calendar events and assignments asynchronously for real data
  useEffect(() => {
    let active = true;
    void getAccessToken().then(async (token) => {
      if (!token) return;
      try {
        const from = new Date(currentYear, currentMonth, 1);
        const to = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        const evs = await fetchCalendarEvents(token, from, to);
        if (active) setCalendarEvents(evs.filter((e) => e.status !== "CANCELLED"));
      } catch {
        // Safe fallback for student calendar
      }

      try {
        const assigns = await fetchMyAssignments(token);
        if (active) setAssignments(assigns);
      } catch {
        // Safe fallback for assignments
      }
    });
    return () => {
      active = false;
    };
  }, [getAccessToken, currentYear, currentMonth]);

  // Events grouped by day of current month
  const eventsByDay: Record<number, CalendarEvent[]> = {};
  for (const ev of calendarEvents) {
    const d = new Date(ev.startsAt);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  }

  // Pending count calculation
  const pendingAssignmentsCount = assignments.filter(
    (a) => a.status === "PUBLISHED" && !a.submittedAt,
  ).length;
  const pendingTasksCount = tasks.filter((t) => !t.done).length + pendingAssignmentsCount;

  // 7-day weekly activity dataset
  const dayOfWeek = new Date().getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0..6 (Mon..Sun)
  const baseHours = [0.8, 1.4, 1.2, 0.6, 1.8, 0.4, 0.0];
  const baseLessons = [1, 2, 2, 1, 3, 1, 0];
  const dayLabels = [
    { key: "T2", full: "Thứ 2" },
    { key: "T3", full: "Thứ 3" },
    { key: "T4", full: "Thứ 4" },
    { key: "T5", full: "Thứ 5" },
    { key: "T6", full: "Thứ 6" },
    { key: "T7", full: "Thứ 7" },
    { key: "CN", full: "Chủ nhật" },
  ];
  const weeklyActivity = dayLabels.map((item, idx) => ({
    day: item.key,
    full: item.full,
    hours: idx <= todayIndex ? baseHours[idx] : 0,
    lessons: idx <= todayIndex ? baseLessons[idx] : 0,
    isToday: idx === todayIndex,
  }));

  const totalWeeklyHours = weeklyActivity.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1);

  // SVG Gauge calculations
  const gaugeRadius = 42;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const strokeDashoffset = gaugeCircumference - (gaugeCircumference * completion) / 100;

  // Selected date events
  const selectedDateEvents = eventsByDay[selectedDate] || [];

  return (
    <div className="space-y-6">
      {/* 1. Header Greeting & Quick Stats Bar */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-heading md:text-[28px]">
              Chào mừng trở lại, <span className="text-primary">{userName}</span>{" "}
              <span
                aria-hidden="true"
                className="inline-block transition-transform hover:rotate-12 cursor-default"
              >
                👋
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted">
              Hôm nay chúng ta hãy cùng học điều gì đó mới mẻ nhé!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/courses"
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 text-xs font-semibold text-heading shadow-xs transition hover:border-emerald-200 hover:bg-emerald-50/30 active:scale-[0.98]"
            >
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <span>Khám phá khóa học</span>
            </Link>
          </div>
        </div>

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-emerald-200 hover:shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Khóa học của bạn</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <BookOpen className="h-4 w-4 stroke-[1.8]" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-heading tabular-nums">
              {enrollments.length}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {enrollments.length > 0 ? "Đang tiến hành học" : "Chưa đăng ký khóa nào"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-emerald-200 hover:shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Bài hoàn thành</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <CheckCircle2 className="h-4 w-4 stroke-[1.8]" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-heading tabular-nums">
              {totalCompleted}
              <span className="text-sm font-normal text-muted">/{totalLessons || 0}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted">{completion}% tổng lộ trình</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-amber-200 hover:shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Chuỗi học tập</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Flame className="h-4 w-4 stroke-[1.8]" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-heading tabular-nums">
              3 <span className="text-sm font-normal text-amber-600">ngày</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted">Duy trì rất tốt hôm nay 🔥</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-blue-200 hover:shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Việc cần làm</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ClipboardList className="h-4 w-4 stroke-[1.8]" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-heading tabular-nums">
              {pendingTasksCount}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {pendingTasksCount > 0 ? "Cần hoàn thành sớm" : "Đã xong toàn bộ"}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Instructor Mode Alert (Streamlined & Dismissible) */}
      {isInstructor && !instructorBannerDismissed && (
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/40 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3.5 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <GraduationCap className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-heading">
                  Bạn đang sử dụng tài khoản Giảng viên
                </p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  Giảng dạy
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                Truy cập Bảng điều khiển Giảng viên để quản lý khóa học, giáo trình và tương tác với
                học viên.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Link
              href="/instructor"
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-dark active:scale-[0.98]"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Bảng điều khiển Giảng viên</span>
            </Link>
            <button
              type="button"
              onClick={() => setInstructorBannerDismissed(true)}
              aria-label="Đóng thông báo giảng viên"
              className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-emerald-100/60 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Dashboard Layout: Left Rail (8 cols) & Right Rail (4 cols) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Main Learning Flow */}
        <div className="space-y-6 lg:col-span-8">
          {/* A. Hero Active Course / Welcome Banner */}
          <section className="portal-card">
            <SectionHeading
              title="Khóa học đã đăng ký gần đây"
              action="Xem tất cả"
              href="/learning/courses"
            />

            {primaryCourse ? (
              <div className="mt-4 space-y-4">
                {/* Premier Featured Course Card */}
                <div className="relative overflow-hidden rounded-2xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50/30 p-5 transition hover:border-emerald-200 hover:shadow-soft">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-xs">
                        <GraduationCap className="h-6 w-6 stroke-[1.8]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            Đang học dở
                          </span>
                          <span className="text-[11px] text-muted">
                            {primaryCourse.courseStatus === "PUBLISHED"
                              ? "Khóa học chính quy"
                              : "Đã lưu trữ"}
                          </span>
                        </div>
                        <Link
                          href={`/learning/courses/${primaryCourse.courseId}`}
                          className="mt-1 block text-base font-bold text-heading hover:text-primary transition-colors line-clamp-1"
                        >
                          {primaryCourse.courseTitle}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">
                          {primaryProgress
                            ? `${primaryProgress.completedLessons}/${primaryProgress.totalLessons} bài học hoàn thành`
                            : "Tiếp tục bài học dở dang để duy trì tiến độ."}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={
                        primaryCourse.courseStatus !== "PUBLISHED"
                          ? "/courses"
                          : `/learning/courses/${primaryCourse.courseId}`
                      }
                      className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-dark active:scale-[0.98] shrink-0"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Tiếp tục học ngay</span>
                    </Link>
                  </div>

                  {/* Progress Indicator */}
                  <div className="mt-4 pt-3 border-t border-slate-100/80">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
                      <span>Tiến độ hoàn thành</span>
                      <span className="font-semibold text-primary tabular-nums">
                        {primaryProgress?.progressPercent ?? 0}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${primaryProgress?.progressPercent ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Secondary enrolled courses if available */}
                {recent.length > 1 && (
                  <div className="grid gap-3 sm:grid-cols-2 pt-1">
                    {recent.slice(1).map((course) => (
                      <RecentCourse
                        key={course.id}
                        course={course}
                        progress={progress[course.courseId]}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 px-6 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100/80 text-primary shadow-xs">
                  <BookOpen className="h-7 w-7 stroke-[1.8]" />
                </div>
                <h3 className="mt-4 text-base font-bold text-heading">
                  Bắt đầu hành trình học tập cùng EduAlto
                </h3>
                <p className="mt-1 max-w-md text-xs leading-5 text-muted">
                  Khám phá hàng chục khóa học chất lượng cao từ các chuyên gia hàng đầu. Đăng ký
                  khóa học đầu tiên để bắt đầu theo dõi tiến độ và nhận chứng chỉ.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Link
                    href="/courses"
                    className="focus-ring inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-dark active:scale-[0.98]"
                  >
                    <span>Tìm khóa học ngay</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-muted">
                  <span>Gợi ý chủ đề:</span>
                  <Link
                    href="/courses"
                    className="rounded-lg bg-white px-2 py-0.5 border border-slate-200 hover:border-emerald-200 hover:text-primary transition"
                  >
                    Lập trình Web
                  </Link>
                  <Link
                    href="/courses"
                    className="rounded-lg bg-white px-2 py-0.5 border border-slate-200 hover:border-emerald-200 hover:text-primary transition"
                  >
                    UI/UX Design
                  </Link>
                  <Link
                    href="/courses"
                    className="rounded-lg bg-white px-2 py-0.5 border border-slate-200 hover:border-emerald-200 hover:text-primary transition"
                  >
                    Java & Spring
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* B. Weekly Learning Activity Chart */}
          <section className="portal-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-heading">
                  Hoạt động học tập tuần này
                </h2>
                <p className="mt-0.5 text-xs text-muted">Thời lượng và tiến độ học tập hàng ngày</p>
              </div>

              {/* View Switcher */}
              <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActivityMetric("hours")}
                  className={cn(
                    "rounded-lg px-2.5 py-1 transition",
                    activityMetric === "hours"
                      ? "bg-white font-semibold text-heading shadow-xs"
                      : "text-muted hover:text-heading",
                  )}
                >
                  Thời gian học
                </button>
                <button
                  type="button"
                  onClick={() => setActivityMetric("lessons")}
                  className={cn(
                    "rounded-lg px-2.5 py-1 transition",
                    activityMetric === "lessons"
                      ? "bg-white font-semibold text-heading shadow-xs"
                      : "text-muted hover:text-heading",
                  )}
                >
                  Bài học
                </button>
              </div>
            </div>

            {/* 7-Day Activity Bars */}
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-[140px] px-2 pb-2 border-b border-dashed border-slate-200">
                {weeklyActivity.map((item) => {
                  const val = activityMetric === "hours" ? item.hours : item.lessons;
                  const maxVal = activityMetric === "hours" ? 2.5 : 4;
                  const heightPercent = Math.min(
                    100,
                    Math.max(8, Math.round((val / maxVal) * 100)),
                  );

                  return (
                    <div
                      key={item.day}
                      className="group relative flex flex-col items-center h-full justify-end"
                    >
                      {/* Tooltip on Hover */}
                      <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-md bg-heading px-2 py-1 text-[10px] font-medium text-white shadow-xs group-hover:block transition">
                        {item.full}: {item.hours}h ({item.lessons} bài)
                      </div>

                      {/* Bar */}
                      <div className="w-full max-w-[36px] h-full flex items-end">
                        <div
                          className={cn(
                            "w-full rounded-t-lg transition-all duration-300",
                            val > 0
                              ? item.isToday
                                ? "bg-primary shadow-xs shadow-primary/30"
                                : "bg-emerald-500/75 hover:bg-primary"
                              : "bg-slate-200/80",
                          )}
                          style={{ height: `${val > 0 ? heightPercent : 8}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day Labels */}
              <div className="mt-3 grid grid-cols-7 gap-2 sm:gap-4 text-center">
                {weeklyActivity.map((item) => (
                  <div key={item.day} className="flex flex-col items-center">
                    <span
                      className={cn(
                        "text-[11px] font-medium transition",
                        item.isToday
                          ? "rounded-md bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800"
                          : "text-muted",
                      )}
                    >
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart Summary Footer */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted pt-2 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <span>
                  ⏱️ Tổng tuần:{" "}
                  <strong className="text-heading font-semibold tabular-nums">
                    {totalWeeklyHours} giờ
                  </strong>
                </span>
                <span>
                  🎯 Mục tiêu tuần:{" "}
                  <strong className="text-primary font-semibold tabular-nums">75%</strong>
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Duy trì phong độ đều đặn ⭐
              </span>
            </div>
          </section>

          {/* C. Quick Access: Saved Documents & Study Notes */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Documents */}
            <section className="portal-card flex flex-col justify-between">
              <div>
                <SectionHeading
                  title="Tài liệu bạn đã lưu"
                  action="Xem thêm"
                  href="/learning/resources"
                />
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-primary">
                    <FolderClosed className="h-5 w-5 stroke-[1.8]" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-heading">Kho tài liệu học tập</p>
                  <p className="mt-1 text-[11px] text-muted">
                    Các tài liệu, slide bài giảng được lưu lại sẽ hiển thị ở đây để bạn ôn tập bất
                    cứ lúc nào.
                  </p>
                </div>
              </div>

              <Link
                href="/learning/resources"
                className="focus-ring mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white py-2 text-xs font-semibold text-heading hover:border-emerald-200 hover:text-primary transition"
              >
                <span>Mở thư viện tài liệu</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </section>

            {/* Notes */}
            <section className="portal-card flex flex-col justify-between">
              <div>
                <SectionHeading
                  title="Ghi chú gần nhất"
                  action="Tất cả ghi chú"
                  href="/learning/notes"
                />
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <NotebookPen className="h-5 w-5 stroke-[1.8]" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-heading">Ghi chú bài giảng</p>
                  <p className="mt-1 text-[11px] text-muted">
                    Ghi lại các ý chính tại các mốc thời gian video để dễ dàng tra cứu lại khi cần
                    làm bài tập.
                  </p>
                </div>
              </div>

              <Link
                href="/learning/notes"
                className="focus-ring mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white py-2 text-xs font-semibold text-heading hover:border-amber-200 hover:text-amber-700 transition"
              >
                <span>Quản lý ghi chú</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </section>
          </div>
        </div>

        {/* RIGHT COLUMN: Calendar, Agenda & Performance */}
        <div className="space-y-6 lg:col-span-4">
          {/* A. Calendar & Upcoming Agenda Widget */}
          <section className="portal-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold capitalize tracking-tight text-heading">
                  {monthName}
                </h2>
                <p className="text-[11px] text-muted">Lịch học và sự kiện</p>
              </div>
              <Link
                href="/learning/calendar"
                className="focus-ring inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary-dark transition"
              >
                <span>Mở lịch</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Weekday Headers */}
            <div className="mt-4 grid grid-cols-7 text-center text-[10px] font-semibold text-muted">
              {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>

            {/* Full Days Grid (All days in month!) */}
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {Array.from({ length: firstWeekday }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {days.map((day) => {
                const isToday = day === currentDay;
                const isSelected = day === selectedDate;
                const hasEvents = Boolean(eventsByDay[day]?.length);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "focus-ring relative mx-auto flex h-7 w-7 items-center justify-center rounded-xl text-xs font-medium transition active:scale-[0.95]",
                      isSelected
                        ? "bg-primary font-bold text-white shadow-xs shadow-primary/30"
                        : isToday
                          ? "border border-primary font-bold text-primary bg-emerald-50/50"
                          : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <span>{day}</span>
                    {hasEvents && !isSelected && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Agenda List Right Below Calendar */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold text-heading">
                  Sự kiện ngày {selectedDate} tháng {currentMonth + 1}
                </h3>
                <span className="text-[10px] text-muted">{selectedDateEvents.length} sự kiện</span>
              </div>

              {selectedDateEvents.length > 0 ? (
                <div className="space-y-2">
                  {selectedDateEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs transition hover:bg-white hover:border-emerald-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-heading line-clamp-1">{ev.title}</span>
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 shrink-0">
                          Đã lên lịch
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Intl.DateTimeFormat("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(ev.startsAt))}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50/60 p-3.5 text-center text-xs">
                  <CalendarDays className="mx-auto h-4 w-4 text-slate-400" />
                  <p className="mt-1.5 text-[11px] text-muted">
                    Không có lịch học nào vào ngày này.
                  </p>
                  <Link
                    href="/learning/calendar"
                    className="focus-ring mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <span>+ Thêm vào thời khóa biểu</span>
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* B. To-Do Tasks & Assignments */}
          <section className="portal-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-heading">Việc cần làm</h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                  {pendingTasksCount}
                </span>
              </div>
              <Link
                href="/learning/assignments"
                className="focus-ring inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary-dark transition"
              >
                <span>Xem bài tập</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {tasks.map((task) => (
                <label
                  key={task.id}
                  className="flex cursor-pointer items-start gap-3 py-2.5 transition hover:bg-slate-50/50 rounded-lg px-1"
                >
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
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-primary cursor-pointer transition active:scale-[0.95]"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-xs font-medium transition",
                        task.done ? "text-slate-400 line-through" : "text-heading font-semibold",
                      )}
                    >
                      {task.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted">
                      {task.detail} ·{" "}
                      <span className="text-emerald-700 font-medium">{task.date}</span>
                    </span>
                  </span>
                </label>
              ))}

              {/* Show pending real assignments if any */}
              {assignments
                .filter((a) => a.status === "PUBLISHED" && !a.submittedAt)
                .slice(0, 2)
                .map((assign) => (
                  <div
                    key={assign.id}
                    className="py-2.5 px-1 flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-heading line-clamp-1">
                        {assign.title}
                      </p>
                      <p className="text-[10px] text-coral font-medium mt-0.5">
                        {assign.dueAt
                          ? `Hạn nộp: ${new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(assign.dueAt))}`
                          : "Bài tập được giao"}
                      </p>
                    </div>
                    <Link
                      href="/learning/assignments"
                      className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-emerald-100 shrink-0 transition"
                    >
                      Làm bài
                    </Link>
                  </div>
                ))}
            </div>
          </section>

          {/* C. Performance & Radial Gauge */}
          <section className="portal-card">
            <SectionHeading title="Hiệu suất học tập" />

            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/40 p-5 text-center">
              {/* Radial SVG Gauge */}
              <div className="relative flex items-center justify-center">
                <svg className="h-28 w-28 -rotate-90 transform" viewBox="0 0 108 108">
                  {/* Background Track */}
                  <circle
                    cx="54"
                    cy="54"
                    r={gaugeRadius}
                    className="text-emerald-100/70"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  {/* Progress Arc */}
                  <circle
                    cx="54"
                    cy="54"
                    r={gaugeRadius}
                    className="text-primary transition-all duration-700 ease-out"
                    strokeWidth="8"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>

                {/* Center Percentage Display */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tracking-tight text-heading tabular-nums">
                    {completion}%
                  </span>
                  <span className="text-[10px] font-medium text-muted">Hoàn thành</span>
                </div>
              </div>

              <p className="mt-3 text-xs font-semibold text-heading">
                {totalCompleted} / {totalLessons || 0} bài học đã hoàn tất
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {completion >= 80
                  ? "Tiến độ xuất sắc! Tiếp tục bứt phá mục tiêu nhé."
                  : completion > 0
                    ? "Đang duy trì thói quen học tập rất tốt."
                    : "Hãy bắt đầu bài học đầu tiên ngay hôm nay!"}
              </p>
            </div>
          </section>
        </div>
      </div>
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
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-tight text-heading">{title}</h2>
      {action && href && (
        <Link
          href={href}
          className="focus-ring inline-flex items-center gap-0.5 text-xs font-semibold text-primary transition hover:text-primary-dark"
        >
          <span>{action}</span>
          <ChevronRight className="h-3 w-3" />
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
        "rounded-2xl border border-slate-200/80 bg-white p-3.5 transition hover:border-emerald-200 hover:shadow-soft",
        compact && "flex items-center gap-3",
      )}
    >
      <div className={cn("flex items-center gap-3", compact && "min-w-0 flex-1")}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-primary">
          <GraduationCap className="h-5 w-5 stroke-[1.8]" />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/learning/courses/${course.courseId}`}
            className="focus-ring line-clamp-1 text-xs font-bold text-heading hover:text-primary transition"
          >
            {course.courseTitle}
          </Link>
          <p className="mt-0.5 text-[11px] text-muted">
            {archived
              ? "Khóa học đã lưu trữ"
              : progress
                ? `${progress.completedLessons}/${progress.totalLessons} bài đã học`
                : "Đang cập nhật tiến độ"}
          </p>
        </div>
        {compact && (
          <Link
            href={archived ? "/courses" : `/learning/courses/${course.courseId}`}
            className="focus-ring inline-flex h-8 shrink-0 items-center rounded-xl bg-emerald-50 px-3 text-xs font-semibold text-primary transition hover:bg-emerald-100 active:scale-[0.98]"
          >
            {archived ? "Khám phá" : "Tiếp tục"}
          </Link>
        )}
      </div>
      {!compact && (
        <>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
            <span>Tiến độ học</span>
            <span className="font-semibold text-primary tabular-nums">
              {archived ? "—" : `${percent}%`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${archived ? 0 : percent}%` }}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Link
              href={archived ? "/courses" : `/learning/courses/${course.courseId}`}
              className="focus-ring inline-flex h-8 items-center gap-1 rounded-xl bg-emerald-50 px-3 text-xs font-semibold text-primary transition hover:bg-emerald-100 active:scale-[0.98]"
            >
              <span>{archived ? "Khám phá lại" : "Tiếp tục học"}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      )}
    </article>
  );
}

function InstructorCourseCard({ course }: { course: InstructorCourse }) {
  const isPublished = course.status === "PUBLISHED";
  const isDraft = course.status === "DRAFT";
  const statusLabel = isPublished ? "Đang xuất bản" : isDraft ? "Bản nháp" : "Đã lưu trữ";
  const statusBadgeClass = isPublished
    ? "border-emerald-400/30 bg-emerald-950/70 text-emerald-200"
    : isDraft
      ? "border-amber-400/30 bg-amber-950/70 text-amber-200"
      : "border-slate-400/30 bg-slate-900/70 text-slate-300";

  const levelLabel =
    course.level === "BEGINNER"
      ? "Cơ bản"
      : course.level === "INTERMEDIATE"
        ? "Trung cấp"
        : course.level === "ADVANCED"
          ? "Nâng cao"
          : "Tất cả cấp độ";

  const formattedPrice =
    course.price === 0
      ? "Miễn phí"
      : new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        })
          .format(course.price)
          .replace("₫", "đ");

  const formattedDate = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
    new Date(course.updatedAt),
  );

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/5">
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950">
            {/* Ambient glowing radial orbs */}
            <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />
            <div className="absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-teal-400/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />
            {/* Subtle dot pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:14px_14px]" />
            {/* Centered emblem */}
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-emerald-200 shadow-xl backdrop-blur-md transition-transform duration-300 group-hover:scale-110 group-hover:bg-white/15">
              <BookOpen className="h-7 w-7 stroke-[1.8]" />
            </div>
            {/* Bottom subtitle strip inside cover */}
            <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-[10px] font-semibold tracking-wider text-emerald-200/60 uppercase">
              <span>EduAlto Giảng viên</span>
              <span>{course.language.toUpperCase()}</span>
            </div>
          </div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-xs",
              statusBadgeClass,
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isPublished
                  ? "bg-emerald-400 animate-pulse"
                  : isDraft
                    ? "bg-amber-400"
                    : "bg-slate-400",
              )}
            />
            {statusLabel}
          </span>
        </div>

        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white shadow-xs backdrop-blur-md">
            {levelLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <h2 className="line-clamp-2 min-h-11 text-sm sm:text-base font-bold leading-snug text-heading transition-colors group-hover:text-primary">
            {course.title}
          </h2>
          {course.tagline ? (
            <p className="mt-1 line-clamp-1 text-xs text-muted leading-relaxed">{course.tagline}</p>
          ) : (
            <p className="mt-1 line-clamp-1 text-xs text-slate-400 italic">Chưa có mô tả ngắn</p>
          )}

          <div className="mt-3.5 flex items-center justify-between text-xs">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-[#079367] tabular-nums">
                {formattedPrice}
              </span>
              {course.originalPrice && course.originalPrice > course.price ? (
                <span className="text-xs text-slate-400 line-through">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                    maximumFractionDigits: 0,
                  })
                    .format(course.originalPrice)
                    .replace("₫", "đ")}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted">
              <Clock className="h-3 w-3 stroke-[1.8]" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3.5">
          <Link
            href={`/instructor/courses/${course.id}/overview`}
            className="focus-ring flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-white shadow-xs shadow-primary/20 transition hover:bg-primary-dark active:scale-[0.98]"
          >
            <span>Quản lý</span>
          </Link>
          <Link
            href={`/instructor/courses/${course.id}/curriculum`}
            className="focus-ring inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-heading active:scale-[0.98]"
            title="Quản lý giáo trình"
          >
            <BookOpen className="h-3.5 w-3.5 text-slate-500" />
            <span>Giáo trình</span>
          </Link>
          <Link
            href={`/courses/${course.slug}`}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-primary active:scale-[0.98]"
            title="Xem trang học viên"
            target="_blank"
            rel="noreferrer"
          >
            <ArrowUpRight className="h-4 w-4 stroke-[1.8]" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function MyCourses({
  courses,
  progress,
  search,
  onSearch,
  isInstructor = false,
  instructorCourses = [],
  instructorCoursesLoading = false,
  instructorTab = "teaching",
  onInstructorTabChange,
}: {
  courses: Enrollment[];
  progress: Record<string, CourseProgress>;
  search: string;
  onSearch: (value: string) => void;
  isInstructor?: boolean;
  instructorCourses?: InstructorCourse[];
  instructorCoursesLoading?: boolean;
  instructorTab?: "teaching" | "learning";
  onInstructorTabChange?: (tab: "teaching" | "learning") => void;
}) {
  const [sortOrder, setSortOrder] = useState<"recent" | "title">("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");

  const [teachingSearch, setTeachingSearch] = useState("");
  const [teachingStatus, setTeachingStatus] = useState<"all" | "PUBLISHED" | "DRAFT" | "ARCHIVED">(
    "all",
  );
  const [teachingSort, setTeachingSort] = useState<"recent" | "title">("recent");

  const filteredTeachingCourses = useMemo(() => {
    const q = teachingSearch.trim().toLocaleLowerCase("vi");
    return instructorCourses
      .filter((course) => {
        const matchesQuery =
          !q ||
          course.title.toLocaleLowerCase("vi").includes(q) ||
          (course.tagline?.toLocaleLowerCase("vi").includes(q) ?? false);
        const matchesStatus = teachingStatus === "all" || course.status === teachingStatus;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (teachingSort === "title") return a.title.localeCompare(b.title, "vi");
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [instructorCourses, teachingSearch, teachingStatus, teachingSort]);

  const filteredCourses = useMemo(() => {
    return [...courses]
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
  }, [courses, sortOrder, statusFilter]);

  if (isInstructor) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-heading md:text-2xl">
                Khóa học của tôi
              </h1>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
                Giảng viên
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Quản lý các khóa học bạn giảng dạy và theo dõi các khóa học bạn đang tham gia học tập
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/instructor"
              className="focus-ring inline-flex h-9.5 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-[0.98]"
            >
              <LayoutDashboard className="h-4 w-4 text-[#20B486]" />
              <span>Bảng điều khiển Giảng viên</span>
            </Link>
            <Link
              href="/instructor/courses/overview"
              className="focus-ring inline-flex h-9.5 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-semibold text-white shadow-xs shadow-primary/25 transition hover:bg-primary-dark active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo khóa học mới</span>
            </Link>
          </div>
        </div>

        {/* Modern Segmented Control */}
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-4">
          <div className="inline-flex p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70 backdrop-blur-xs gap-1">
            <button
              type="button"
              onClick={() => onInstructorTabChange?.("teaching")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
                instructorTab === "teaching"
                  ? "bg-white text-heading shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-heading hover:bg-white/50",
              )}
            >
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Khóa học giảng dạy</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums",
                  instructorTab === "teaching"
                    ? "bg-emerald-50 text-primary border border-emerald-200/60"
                    : "bg-slate-200/70 text-slate-600",
                )}
              >
                {instructorCourses.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onInstructorTabChange?.("learning")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
                instructorTab === "learning"
                  ? "bg-white text-heading shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-heading hover:bg-white/50",
              )}
            >
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>Khóa học đang học</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums",
                  instructorTab === "learning"
                    ? "bg-emerald-50 text-primary border border-emerald-200/60"
                    : "bg-slate-200/70 text-slate-600",
                )}
              >
                {courses.length}
              </span>
            </button>
          </div>
        </div>

        {instructorTab === "teaching" ? (
          <div className="space-y-6">
            {/* 4 Stat Metric Cards */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <div className="portal-card flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-emerald-200">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-primary border border-emerald-100">
                  <BookOpen className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">Tổng khóa học</p>
                  <p className="text-2xl font-bold tracking-tight text-heading tabular-nums">
                    {instructorCourses.length}
                  </p>
                </div>
              </div>

              <div className="portal-card flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-teal-200">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
                  <CheckCircle2 className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">Đang xuất bản</p>
                  <p className="text-2xl font-bold tracking-tight text-teal-700 tabular-nums">
                    {instructorCourses.filter((c) => c.status === "PUBLISHED").length}
                  </p>
                </div>
              </div>

              <div className="portal-card flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-amber-200">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                  <FileText className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">Bản nháp</p>
                  <p className="text-2xl font-bold tracking-tight text-amber-700 tabular-nums">
                    {instructorCourses.filter((c) => c.status === "DRAFT").length}
                  </p>
                </div>
              </div>

              <div className="portal-card flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-slate-300">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                  <FolderClosed className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">Đã lưu trữ</p>
                  <p className="text-2xl font-bold tracking-tight text-slate-700 tabular-nums">
                    {instructorCourses.filter((c) => c.status === "ARCHIVED").length}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex h-10.5 w-full sm:max-w-[360px] items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition">
                <Search className="h-4 w-4 text-primary shrink-0" />
                <span className="sr-only">Tìm kiếm khóa học giảng dạy</span>
                <input
                  value={teachingSearch}
                  onChange={(event) => setTeachingSearch(event.target.value)}
                  placeholder="Tìm kiếm khóa học giảng dạy..."
                  className="min-w-0 flex-1 text-xs sm:text-sm outline-none placeholder:text-slate-400 bg-transparent text-heading"
                />
                {teachingSearch && (
                  <button
                    type="button"
                    onClick={() => setTeachingSearch("")}
                    className="rounded-full p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted font-medium">Trạng thái:</span>
                  <select
                    aria-label="Lọc trạng thái khóa học"
                    value={teachingStatus}
                    onChange={(event) =>
                      setTeachingStatus(event.target.value as typeof teachingStatus)
                    }
                    className="focus-ring h-9.5 rounded-xl border border-slate-200/80 bg-white px-3 font-semibold text-slate-700 shadow-xs hover:border-slate-300"
                  >
                    <option value="all">Tất cả</option>
                    <option value="PUBLISHED">Đang xuất bản</option>
                    <option value="DRAFT">Bản nháp</option>
                    <option value="ARCHIVED">Đã lưu trữ</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-muted font-medium">Sắp xếp:</span>
                  <select
                    aria-label="Sắp xếp khóa học"
                    value={teachingSort}
                    onChange={(event) => setTeachingSort(event.target.value as typeof teachingSort)}
                    className="focus-ring h-9.5 rounded-xl border border-slate-200/80 bg-white px-3 font-semibold text-slate-700 shadow-xs hover:border-slate-300"
                  >
                    <option value="recent">Mới cập nhật</option>
                    <option value="title">Tên khóa học</option>
                  </select>
                </div>

                <span className="ml-auto rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 tabular-nums">
                  {filteredTeachingCourses.length} khóa học
                </span>
              </div>
            </div>

            {/* Courses Grid */}
            {instructorCoursesLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <div className="skeleton h-72 rounded-2xl" />
                <div className="skeleton h-72 rounded-2xl" />
                <div className="skeleton h-72 rounded-2xl" />
                <div className="skeleton h-72 rounded-2xl" />
              </div>
            ) : filteredTeachingCourses.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTeachingCourses.map((course) => (
                  <InstructorCourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center sm:p-12 shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-primary">
                  <BookOpen className="h-7 w-7 stroke-[1.8]" />
                </div>
                <h3 className="mt-4 text-base font-bold text-heading">
                  {teachingSearch || teachingStatus !== "all"
                    ? "Không tìm thấy khóa học phù hợp"
                    : "Bạn chưa tạo khóa học nào"}
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted leading-relaxed">
                  {teachingSearch || teachingStatus !== "all"
                    ? "Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc trạng thái."
                    : "Bắt đầu xây dựng khóa học đầu tiên để chia sẻ kiến thức trên EduAlto."}
                </p>
                <div className="mt-5 flex justify-center">
                  {teachingSearch || teachingStatus !== "all" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTeachingSearch("");
                        setTeachingStatus("all");
                      }}
                      className="focus-ring inline-flex h-9.5 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      Xóa bộ lọc
                    </button>
                  ) : (
                    <Link
                      href="/instructor/courses/overview"
                      className="focus-ring inline-flex h-9.5 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-xs shadow-primary/20 hover:bg-primary-dark active:scale-[0.98]"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tạo khóa học đầu tiên</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCourses.length > 0 ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex h-10.5 w-full sm:max-w-[360px] items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition">
                    <Search className="h-4 w-4 text-primary shrink-0" />
                    <span className="sr-only">Tìm kiếm khóa học đã ghi danh</span>
                    <input
                      value={search}
                      onChange={(event) => onSearch(event.target.value)}
                      placeholder="Tìm kiếm khóa học..."
                      className="min-w-0 flex-1 text-xs sm:text-sm outline-none placeholder:text-slate-400 bg-transparent text-heading"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => onSearch("")}
                        className="rounded-full p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </label>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted font-medium">Xếp theo:</span>
                      <select
                        aria-label="Sắp xếp khóa học"
                        value={sortOrder}
                        onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
                        className="focus-ring h-9.5 rounded-xl border border-slate-200/80 bg-white px-3 font-semibold text-slate-700 shadow-xs hover:border-slate-300"
                      >
                        <option value="recent">Mới nhất</option>
                        <option value="title">Tên khóa học</option>
                      </select>
                    </div>
                    <span className="ml-auto rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 tabular-nums">
                      {filteredCourses.length} khóa học
                    </span>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCourses.map((course, index) => (
                    <CourseGridCard
                      key={course.id}
                      course={course}
                      progress={progress[course.courseId]}
                      index={index}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="portal-card rounded-2xl border border-slate-200/80 bg-white p-8 md:p-12 text-center shadow-xs">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-primary border border-emerald-100">
                  <GraduationCap className="h-8 w-8 stroke-[1.8]" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-heading">
                  Bạn đang sử dụng tài khoản Giảng viên
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-muted leading-relaxed">
                  Hiện tại bạn chưa đăng ký tham gia khóa học nào với vai trò học viên. Bạn có thể
                  xem các khóa học bạn đang giảng dạy tại mục <strong>Khóa học giảng dạy</strong>{" "}
                  hoặc khám phá thêm các khóa học bổ ích trên nền tảng.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onInstructorTabChange?.("teaching")}
                    className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-xs sm:text-sm font-semibold text-white shadow-xs shadow-primary/25 transition hover:bg-primary-dark active:scale-[0.98]"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Xem khóa học giảng dạy</span>
                  </button>
                  <Link
                    href="/courses"
                    className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-[0.98]"
                  >
                    <span>Khám phá khóa học EduAlto</span>
                  </Link>
                  <Link
                    href="/instructor"
                    className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-5 text-xs sm:text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100/60 active:scale-[0.98]"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Bảng điều khiển Giảng viên</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Student view
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-heading md:text-2xl">
              Khóa học của tôi
            </h1>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
              {filteredCourses.length} khóa học
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Theo dõi tiến độ học tập và tiếp tục các bài học bạn đã ghi danh
          </p>
        </div>
        <Link
          href="/courses"
          className="focus-ring inline-flex h-9.5 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-xs shadow-primary/25 transition hover:bg-primary-dark active:scale-[0.98]"
        >
          <BookOpen className="h-4 w-4" />
          <span>Khám phá khóa học</span>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10.5 w-full sm:max-w-[360px] items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3.5 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition">
          <Search className="h-4 w-4 text-primary shrink-0" />
          <span className="sr-only">Tìm kiếm khóa học đã ghi danh</span>
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Tìm kiếm khóa học..."
            className="min-w-0 flex-1 text-xs sm:text-sm outline-none placeholder:text-slate-400 bg-transparent text-heading"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="rounded-full p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted font-medium">Xếp theo:</span>
            <select
              aria-label="Sắp xếp khóa học"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
              className="focus-ring h-9.5 rounded-xl border border-slate-200/80 bg-white px-3 font-semibold text-slate-700 shadow-xs hover:border-slate-300"
            >
              <option value="recent">Mới nhất</option>
              <option value="title">Tên khóa học</option>
            </select>
          </div>
          <button
            type="button"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((open) => !open)}
            className={cn(
              "focus-ring inline-flex h-9.5 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition active:scale-[0.98]",
              showFilters
                ? "border-primary bg-emerald-50/50 text-primary"
                : "border-slate-200/80 bg-white text-slate-700 shadow-xs hover:border-slate-300",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Lọc</span>
          </button>
          {showFilters && (
            <select
              aria-label="Lọc trạng thái khóa học"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="focus-ring h-9.5 rounded-xl border border-slate-200/80 bg-white px-3 font-semibold text-slate-700 shadow-xs hover:border-slate-300"
            >
              <option value="all">Tất cả khóa học</option>
              <option value="active">Đang học</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
          )}
          <span className="ml-auto rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 tabular-nums">
            {filteredCourses.length} khóa học
          </span>
        </div>
      </div>

      {filteredCourses.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center sm:p-12 shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-primary">
            <BookOpen className="h-7 w-7 stroke-[1.8]" />
          </div>
          <h3 className="mt-4 text-base font-bold text-heading">
            {search || statusFilter !== "all"
              ? "Không tìm thấy khóa học phù hợp"
              : "Bạn chưa ghi danh khóa học nào"}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted leading-relaxed">
            {search || statusFilter !== "all"
              ? "Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc trạng thái."
              : "Khám phá hàng trăm khóa học chất lượng cao trên EduAlto và bắt đầu học ngay hôm nay."}
          </p>
          <div className="mt-5 flex justify-center">
            {search || statusFilter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  onSearch("");
                  setStatusFilter("all");
                }}
                className="focus-ring inline-flex h-9.5 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98]"
              >
                Xóa bộ lọc
              </button>
            ) : (
              <Link
                href="/courses"
                className="focus-ring inline-flex h-9.5 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-xs shadow-primary/20 hover:bg-primary-dark active:scale-[0.98]"
              >
                <BookOpen className="h-4 w-4" />
                <span>Khám phá khóa học</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
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
    "from-emerald-900 via-teal-950 to-slate-950",
    "from-teal-900 via-cyan-950 to-slate-950",
    "from-slate-900 via-emerald-950 to-slate-950",
  ];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/5">
      <div
        className={cn(
          "relative flex aspect-video w-full items-center justify-center overflow-hidden bg-gradient-to-br",
          tones[index % tones.length],
        )}
      >
        {/* Ambient glowing radial orbs */}
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:14px_14px]" />

        {/* Central emblem */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-xl backdrop-blur-md transition-transform duration-300 group-hover:scale-110 group-hover:bg-white/15">
          <BookOpen className="h-7 w-7 stroke-[1.8] text-emerald-200" />
        </div>

        <div className="absolute left-3 top-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-xs",
              archived
                ? "border-slate-400/30 bg-slate-900/70 text-slate-300"
                : "border-emerald-400/30 bg-emerald-950/70 text-emerald-200",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                archived ? "bg-slate-400" : "bg-emerald-400 animate-pulse",
              )}
            />
            {archived ? "Đã lưu trữ" : "Đang học"}
          </span>
        </div>

        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs backdrop-blur-md tabular-nums">
            {percent}%
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <h2 className="line-clamp-2 min-h-11 text-sm sm:text-base font-bold leading-snug text-heading transition-colors group-hover:text-primary">
            {course.courseTitle}
          </h2>
          <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-1 text-[11px]">
              <CalendarDays className="h-3 w-3 stroke-[1.8]" />
              <span>
                Ghi danh: {new Intl.DateTimeFormat("vi-VN").format(new Date(course.enrolledAt))}
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 tabular-nums">
              {archived
                ? "Không khả dụng"
                : `${progress?.completedLessons ?? 0}/${progress?.totalLessons ?? 0} bài`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${archived ? 0 : percent}%` }}
              />
            </div>
          </div>
        </div>

        <Link
          href={archived ? "/courses" : `/learning/courses/${course.courseId}`}
          className="focus-ring mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-white shadow-xs shadow-primary/20 transition hover:bg-primary-dark active:scale-[0.98]"
        >
          {archived ? (
            <>
              <span>Tìm khóa học tương tự</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>Tiếp tục học</span>
            </>
          )}
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
    <div className="portal-card grid min-h-[420px] place-items-center rounded-2xl border border-slate-200/80 bg-white px-5 py-12 shadow-xs">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-primary border border-emerald-100 shadow-xs">
          <Icon className="h-7 w-7 stroke-[1.8]" />
        </span>
        <h2 className="mt-5 text-lg font-bold text-heading">{config.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{config.copy}</p>
        <Link
          href={config.href}
          className="focus-ring mt-5 inline-flex h-9.5 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-xs shadow-primary/20 hover:bg-primary-dark transition active:scale-[0.98]"
        >
          <span>{config.action}</span>
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
    void loadAssignments();
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
    void loadNotes();
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
