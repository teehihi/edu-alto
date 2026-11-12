"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Flame,
  FolderClosed,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Play,
  Search,
  X,
} from "lucide-react";
import { LearningRecommendationsWidget } from "@/features/learning/learning-recommendations-widget";
import {
  OverviewActivityChart,
  OverviewRightRail,
} from "@/features/learning/portal/portal-overview-widgets";
import { RecentCourse, SectionHeading } from "@/features/learning/portal/portal-shared";
import { fetchMyAssignments, type Assignment } from "@/lib/assignment-client";
import { useAuthSession } from "@/lib/auth-session";
import type { CourseProgress, Enrollment } from "@/lib/learning-client";
import { fetchCalendarEvents, type CalendarEvent } from "@/lib/schedule-client";
import {
  fetchStudentLearningAnalytics,
  type StudentLearningAnalyticsOverview,
} from "@/lib/student-analytics-client";

export function Overview({
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
  const [instructorBannerDismissed, setInstructorBannerDismissed] = useState(false);
  const [activityMetric, setActivityMetric] = useState<"hours" | "lessons">("hours");
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [analytics, setAnalytics] = useState<StudentLearningAnalyticsOverview | null>(null);

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

  // Fetch calendar events, assignments, and student analytics asynchronously for real data
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

      try {
        const overviewData = await fetchStudentLearningAnalytics(token, 7);
        if (active) setAnalytics(overviewData);
      } catch {
        // Safe fallback when user has no student analytics profile (e.g. instructor-only)
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

  // Real pending assignments & focus items
  const focusItems = analytics?.focusItems ?? [];
  const focusAssignmentIds = new Set(
    focusItems
      .filter((item) => item.id.startsWith("assignment-"))
      .map((item) => item.id.slice("assignment-".length)),
  );
  const remainingPendingAssignments = assignments.filter(
    (a) => a.status === "PUBLISHED" && !a.submittedAt && !focusAssignmentIds.has(a.id),
  );
  const pendingTasksCount = focusItems.length + remainingPendingAssignments.length;

  // Real 7-day weekly activity dataset (fallback zeros before load or for non-student roles)
  const dayOfWeek = new Date().getDay();
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0..6 (Mon..Sun)
  const dayLabels = [
    { key: "T2", full: "Thứ 2" },
    { key: "T3", full: "Thứ 3" },
    { key: "T4", full: "Thứ 4" },
    { key: "T5", full: "Thứ 5" },
    { key: "T6", full: "Thứ 6" },
    { key: "T7", full: "Thứ 7" },
    { key: "CN", full: "Chủ nhật" },
  ];
  const weeklyActivity =
    analytics && analytics.currentWeekActivity.length === 7
      ? analytics.currentWeekActivity.map((item) => ({
          day: item.label,
          full: item.fullLabel,
          hours: item.studyHours,
          lessons: item.completedLessons,
          isToday: item.today,
        }))
      : dayLabels.map((item, idx) => ({
          day: item.key,
          full: item.full,
          hours: 0,
          lessons: 0,
          isToday: idx === todayIndex,
        }));

  const maxWeeklyVal =
    activityMetric === "hours"
      ? Math.max(1, ...weeklyActivity.map((item) => item.hours))
      : Math.max(1, ...weeklyActivity.map((item) => item.lessons));
  const totalWeeklyHours = (
    analytics?.summary.currentWeekHours ?? weeklyActivity.reduce((acc, curr) => acc + curr.hours, 0)
  ).toFixed(1);
  const currentStreakDays = analytics?.summary.currentStreakDays ?? 0;
  const longestStreakDays = analytics?.summary.longestStreakDays ?? 0;
  const currentWeekActiveDays = analytics?.summary.currentWeekActiveDays ?? 0;
  const overallAvgScore = analytics?.summary.overallAverageScoreOutOf10 ?? null;

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
              href="/learning/analytics"
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 text-xs font-semibold text-primary shadow-xs transition hover:bg-emerald-100/70 active:scale-[0.98]"
            >
              <span>Phân tích học tập</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
              {currentStreakDays} <span className="text-sm font-normal text-amber-600">ngày</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {longestStreakDays > 0
                ? `Kỷ lục dài nhất: ${longestStreakDays} ngày`
                : "Bắt đầu bài học để tạo chuỗi"}
            </p>
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
              {pendingTasksCount > 0 ? "Cần ưu tiên hoàn thành" : "Đã xong toàn bộ"}
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

          {/* A2. Personalized Learning & Course Recommendations */}
          <LearningRecommendationsWidget hasEnrollments={enrollments.length > 0} />

          {/* B. Weekly Learning Activity Chart */}
          <OverviewActivityChart
            activityMetric={activityMetric}
            onActivityMetricChange={setActivityMetric}
            weeklyActivity={weeklyActivity}
            maxWeeklyVal={maxWeeklyVal}
            totalWeeklyHours={totalWeeklyHours}
            currentWeekActiveDays={currentWeekActiveDays}
          />

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
        <OverviewRightRail
          monthName={monthName}
          currentMonth={currentMonth}
          currentDay={currentDay}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          firstWeekday={firstWeekday}
          days={days}
          eventsByDay={eventsByDay}
          selectedDateEvents={selectedDateEvents}
          pendingTasksCount={pendingTasksCount}
          focusItems={focusItems}
          remainingPendingAssignments={remainingPendingAssignments}
          completion={completion}
          totalCompleted={totalCompleted}
          totalLessons={totalLessons}
          overallAvgScore={overallAvgScore}
        />
      </div>
    </div>
  );
}
