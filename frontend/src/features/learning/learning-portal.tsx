"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  FolderClosed,
  FileText,
  GraduationCap,
  Home,
  House,
  Menu,
  MessageCircle,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ApiClientError } from "@/lib/api";
import {
  fetchCourseProgress,
  fetchMyEnrollments,
  type CourseProgress,
  type Enrollment,
} from "@/lib/learning-client";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";

type PortalView =
  | "overview"
  | "courses"
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
  assignments: "Bài tập",
  calendar: "Thời khóa biểu",
  discussion: "Thảo luận",
  resources: "Tài liệu đã lưu",
  notes: "Ghi chú của tôi",
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
  const { user, isLoading, getAccessToken } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressByCourse, setProgressByCourse] = useState<Record<string, CourseProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
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
  }, [getAccessToken, isLoading, pathname, router, user]);

  const visibleCourses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    return enrollments.filter(
      (item) => !query || item.courseTitle.toLocaleLowerCase("vi").includes(query),
    );
  }, [enrollments, search]);
  return (
    <div className="learning-app min-h-screen bg-[#f8fbfa] text-[#101a2c]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={cn(
            "learning-sidebar fixed inset-y-0 left-0 z-50 w-[250px] border-r border-[#e4ebe8] bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-[#eef2f0] px-5 lg:hidden">
            <span className="font-bold text-primary">EduAlto</span>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Đóng menu"
              className="focus-ring rounded-md p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="hidden h-[72px] items-center border-b border-[#eef2f0] px-7 lg:flex">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight text-[#101a2c]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e4faf3] text-primary">
                <GraduationCap className="h-5 w-5" />
              </span>
              EduAlto
            </Link>
          </div>
          <nav aria-label="Điều hướng học tập" className="space-y-7 px-3 py-5">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-2 px-3 text-[10px] font-bold tracking-[.12em] text-[#98a3a0]">
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {group.links.map((item) => {
                    const Icon = item.icon;
                    const selected = item.view === view;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileNavOpen(false)}
                          aria-current={selected ? "page" : undefined}
                          className={cn(
                            "focus-ring flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition",
                            selected
                              ? "bg-[#079b70] text-white shadow-sm"
                              : "text-[#66736f] hover:bg-[#eefaf6] hover:text-[#078d67]",
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
          <div className="absolute inset-x-3 bottom-4 hidden rounded-xl bg-[#f4fbf8] p-3 lg:block">
            <p className="flex items-center gap-2 text-xs font-semibold text-[#586661]">
              <CircleHelp className="h-4 w-4 text-primary" />
              Cần hỗ trợ?
            </p>
            <Link
              href="/contact"
              className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
            >
              Liên hệ đội ngũ EduAlto
            </Link>
          </div>
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
          <div className="learning-topbar sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-[#dcefe8] bg-[#eafaf5]/95 px-4 backdrop-blur md:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="focus-ring rounded-md p-2 text-[#64716e] lg:hidden"
                aria-label="Mở menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <label className="hidden h-9 w-[290px] items-center gap-2 rounded-lg border border-[#cfe8df] bg-white px-3 sm:flex">
                <Search className="h-4 w-4 text-[#94a39e]" />
                <span className="sr-only">Tìm kiếm</span>
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent text-xs outline-none placeholder:text-[#98a39e]"
                  placeholder="Bạn muốn học gì?"
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <UserAvatar name={user?.fullName ?? "Học viên"} avatarUrl={user?.avatarUrl ?? null} />
              <span className="hidden max-w-44 truncate text-xs font-medium text-[#27332f] sm:inline">
                {user?.fullName ?? "Học viên"}
              </span>
              <ChevronDown className="h-4 w-4 text-primary" />
            </div>
          </div>
          <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-7 md:py-8 xl:px-9">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#8b9692]">
                  Khu vực học viên <span className="mx-1">/</span>{" "}
                  <span className="font-medium text-primary">{viewTitles[view]}</span>
                </p>
                <h1 className="mt-2 text-xl font-semibold text-[#101a2c] md:text-2xl">
                  {viewTitles[view]}
                </h1>
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
  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-r from-[#e2f8f1] via-white to-[#f6fbf9] px-5 py-6 md:px-8 md:py-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-[#62716c]">Chào buổi học tập,</p>
            <h2 className="mt-1 text-2xl font-bold text-[#101a2c] md:text-[30px]">
              {userName} <span aria-hidden="true">👋</span>
            </h2>
            <p className="mt-2 max-w-lg text-sm text-[#7d8985]">
              Một bước nhỏ mỗi ngày sẽ đưa bạn đến gần mục tiêu hơn.
            </p>
          </div>
          <div className="flex gap-3">
            <StatCard
              label="Khóa học"
              value={String(enrollments.length)}
              icon={<BookOpen className="h-5 w-5" />}
            />
            <StatCard
              label="Bài đã học"
              value={`${totalCompleted}/${totalLessons}`}
              icon={<Check className="h-5 w-5" />}
            />
          </div>
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_.94fr]">
        <section className="portal-card">
          <SectionHeading
            title="Khóa học đã đăng ký gần đây"
            action="Xem tất cả"
            href="/learning/courses"
          />
          {recent.length ? (
            <div className="mt-4 space-y-3">
              {recent.map((course) => (
                <RecentCourse
                  key={course.id}
                  course={course}
                  progress={progress[course.courseId]}
                />
              ))}
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
          <SectionHeading title="Tiến độ học tập" />
          <div className="mt-5 rounded-xl border border-[#edf1ef] bg-[#fcfefd] p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs text-[#73807c]">Bài học đã hoàn thành</span>
              <span className="text-xs font-semibold text-primary">
                {totalLessons ? Math.round((totalCompleted / totalLessons) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e9f2ee]">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${totalLessons ? Math.round((totalCompleted / totalLessons) * 100) : 0}%`,
                }}
              />
            </div>
            {recent.length ? (
              <div
                className="mt-6 grid grid-cols-5 items-end gap-2"
                aria-label="Tiến độ theo khóa học"
              >
                {recent.slice(0, 5).map((course) => {
                  const value = progress[course.courseId]?.progressPercent ?? 0;
                  return (
                    <div key={course.id} className="flex min-w-0 flex-col items-center gap-2">
                      <div className="flex h-20 w-full items-end overflow-hidden rounded-md bg-[#e8f8f2]">
                        <span
                          className="w-full rounded-md bg-primary/80"
                          style={{ height: `${value}%`, minHeight: value ? 6 : 0 }}
                        />
                      </div>
                      <span className="w-full truncate text-center text-[10px] text-[#8a9591]">
                        {course.courseTitle}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 rounded-lg bg-white p-4 text-center text-xs text-[#87928d]">
                Tiến độ của khóa học sẽ hiện ở đây.
              </p>
            )}
          </div>
          <p className="mt-3 text-xs text-[#8b9692]">
            Tổng quan được tính theo giáo trình đang xuất bản.
          </p>
        </section>
        <section className="portal-card">
          <SectionHeading title="Việc cần làm" />
          <div className="mt-3 divide-y divide-[#edf1ef]">
            {tasks.map((task) => (
              <label key={task.id} className="flex cursor-pointer items-start gap-3 py-3">
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
                  className="mt-0.5 h-4 w-4 accent-[#20b486]"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      task.done && "text-[#9ba5a1] line-through",
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="mt-1 block text-xs text-[#8a9591]">
                    {task.detail} · {task.date}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <Link
            href="/learning/assignments"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Xem bài tập <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
      <section className="portal-card">
        <SectionHeading title="Tiếp tục học" action="Mở thư viện" href="/learning/courses" />
        {recent.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((course) => (
              <RecentCourse
                key={course.id}
                course={course}
                progress={progress[course.courseId]}
                compact
              />
            ))}
          </div>
        ) : (
          <SmallEmpty
            icon={<Sparkles className="h-5 w-5" />}
            title="Lộ trình học của bạn sẽ hiện ở đây"
            detail="Khi ghi danh khóa học, bạn sẽ dễ dàng quay lại đúng nơi đã dừng."
            action="Khám phá khóa học"
            href="/courses"
          />
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex min-w-[112px] items-center gap-2.5 rounded-xl border border-white bg-white/90 px-3 py-2 shadow-sm">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e6faf3] text-primary">
        {icon}
      </span>
      <span>
        <span className="block text-lg font-bold text-[#101a2c]">{value}</span>
        <span className="block text-[10px] text-[#89948f]">{label}</span>
      </span>
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
            className="focus-ring shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-[#159e75]"
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
        className="focus-ring mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-[#159e75]"
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
  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-[#e7efeb] bg-white p-3 sm:flex-row sm:items-center">
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
        <p className="text-xs text-[#7c8783]">{courses.length} khóa học đã ghi danh</p>
      </div>
      {courses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {courses.map((course, index) => (
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
          title={search ? "Không tìm thấy khóa học" : "Bạn chưa ghi danh khóa học nào"}
          detail={
            search
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

function UtilityView({ view }: { view: Exclude<PortalView, "overview" | "courses"> }) {
  if (view === "calendar") return <CalendarView />;
  if (view === "notes") return <NotesView />;
  if (view === "assignments") return <AssignmentsView />;
  const configs = {
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

function AssignmentsView() {
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const filters = [
    { id: "all", label: "Tất cả" },
    { id: "todo", label: "Cần hoàn thành" },
    { id: "done", label: "Đã hoàn thành" },
  ] as const;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 rounded-xl border border-[#e5ede9] bg-white p-3">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "focus-ring rounded-lg px-4 py-2 text-xs font-semibold transition",
              filter === item.id
                ? "bg-primary text-white"
                : "bg-[#f6f9f7] text-[#66736f] hover:bg-[#eaf8f2]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section className="rounded-xl border border-[#e5ede9] bg-white p-5 md:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#26332e]">Bài tập và bài kiểm tra</h2>
            <p className="mt-1 text-xs text-[#87928d]">
              {filter === "done"
                ? "Bài đã hoàn thành sẽ hiển thị ở đây."
                : "Hạn nộp từ các khóa học đã ghi danh sẽ hiển thị tại đây."}
            </p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8faf4] text-primary">
            <ClipboardList className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-5">
          <SmallEmpty
            icon={<Check className="h-5 w-5" />}
            title="Chưa có bài tập cần làm"
            detail="Bạn có thể tiếp tục học bài văn bản trong các khóa học của mình."
            action="Mở khóa học của tôi"
            href="/learning/courses"
          />
        </div>
      </section>
    </div>
  );
}

function CalendarView() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthDays = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => index - firstWeekday + 1);
  const title = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(
    monthDate,
  );
  const selectedLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(selected);
  function shiftMonth(delta: number) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="rounded-xl border border-[#e5ede9] bg-white p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-primary">THỜI KHÓA BIỂU</p>
            <h2 className="mt-1 text-xl font-semibold capitalize text-[#26332e]">{title}</h2>
          </div>
          <div className="flex gap-1">
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
        <div className="mt-5 grid grid-cols-7 text-center text-[11px] font-semibold text-[#84908b]">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
            <span key={day} className="py-2">
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            const inMonth = day > 0 && day <= monthDays;
            const date = new Date(year, month, day);
            const isSelected = inMonth && selected.toDateString() === date.toDateString();
            const isToday = inMonth && new Date().toDateString() === date.toDateString();
            return (
              <button
                key={index}
                disabled={!inMonth}
                onClick={() => setSelected(date)}
                className={cn(
                  "focus-ring aspect-square rounded-lg text-sm transition",
                  !inMonth && "invisible",
                  isSelected && "bg-primary font-semibold text-white",
                  !isSelected && isToday && "border border-primary text-primary",
                  !isSelected && !isToday && "text-[#35413c] hover:bg-[#edf9f4]",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
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
        <div className="mt-5 rounded-lg bg-[#f8fbf9] px-4 py-8 text-center">
          <p className="text-sm font-medium text-[#47534e]">Chưa có sự kiện</p>
          <p className="mt-1 text-xs leading-5 text-[#87928d]">
            Lịch học và hạn nộp sẽ xuất hiện khi được thiết lập cho khóa học.
          </p>
        </div>
        <Link
          href="/learning/courses"
          className="focus-ring mt-4 inline-flex text-xs font-semibold text-primary hover:underline"
        >
          Xem khóa học của tôi
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </aside>
    </div>
  );
}

type LearnerNote = { id: string; title: string; body: string; updatedAt: string };
const NOTES_KEY = "edualto:learning-notes:v1";

function NotesView() {
  const [notes, setNotes] = useState<LearnerNote[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved: unknown = JSON.parse(window.localStorage.getItem(NOTES_KEY) ?? "[]");
        if (Array.isArray(saved)) setNotes(saved as LearnerNote[]);
      } catch {
        setNotes([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setMessage("Nhập tiêu đề và nội dung ghi chú.");
      return;
    }
    const next = [
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        body: body.trim(),
        updatedAt: new Date().toISOString(),
      },
      ...notes,
    ];
    setNotes(next);
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
    setTitle("");
    setBody("");
    setMessage("Ghi chú đã được lưu trên thiết bị này.");
  }
  function removeNote(id: string) {
    const next = notes.filter((note) => note.id !== id);
    setNotes(next);
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
  }
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-xl border border-[#e5ede9] bg-white p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-primary">GHI CHÚ CỦA TÔI</p>
            <h2 className="mt-1 text-lg font-semibold">Điều bạn muốn nhớ</h2>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8faf4] text-primary">
            <NotebookPen className="h-5 w-5" />
          </span>
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
          <button className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75]">
            <Plus className="h-4 w-4" />
            Lưu ghi chú
          </button>
        </form>
      </section>
      <section className="rounded-xl border border-[#e5ede9] bg-white p-5 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Ghi chú gần đây</h2>
          <span className="text-xs text-[#87928d]">{notes.length}</span>
        </div>
        {notes.length ? (
          <ul className="mt-4 space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg border border-[#e8eeeb] p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#34413c]">{note.title}</h3>
                  <button
                    type="button"
                    onClick={() => removeNote(note.id)}
                    aria-label={`Xóa ghi chú ${note.title}`}
                    className="focus-ring rounded px-1 text-xs text-rose-600 hover:bg-rose-50"
                  >
                    Xóa
                  </button>
                </div>
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-[#77837e]">
                  {note.body}
                </p>
                <time className="mt-3 block text-[10px] text-[#9ba5a1]">
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
              Ghi chú sẽ được lưu trên thiết bị hiện tại.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
