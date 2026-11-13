"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";
import {
  fetchStudentCourseAnalytics,
  fetchStudentLearningAnalytics,
  type StudentCourseAnalytics,
  type StudentLearningAnalyticsOverview,
} from "@/lib/student-analytics-client";

interface StudentAnalyticsViewProps {
  isInstructor?: boolean;
  predictionSlot?: ReactNode;
}

export function StudentAnalyticsView({
  isInstructor = false,
  predictionSlot,
}: StudentAnalyticsViewProps) {
  const { getAccessToken } = useAuthSession();
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const [reloadKey, setReloadKey] = useState(0);
  const [overview, setOverview] = useState<StudentLearningAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [instructorOnlyNotice, setInstructorOnlyNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetailById, setCourseDetailById] = useState<Record<string, StudentCourseAnalytics>>(
    {},
  );
  const [courseDetailLoadingId, setCourseDetailLoadingId] = useState<string | null>(null);
  const [courseDetailError, setCourseDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function syncOverview() {
      try {
        const token = await getAccessToken();
        if (cancelled) return;
        if (!token) {
          setLoading(false);
          return;
        }
        const data = await fetchStudentLearningAnalytics(token, windowDays);
        if (cancelled) return;
        setOverview(data);
        setError(null);
        setInstructorOnlyNotice(false);
      } catch (reason: unknown) {
        if (cancelled) return;
        if (
          isInstructor &&
          reason instanceof ApiClientError &&
          (reason.status === 403 || reason.code === "STUDENT_REQUIRED")
        ) {
          setInstructorOnlyNotice(true);
          setOverview(null);
          setError(null);
        } else {
          setError(
            reason instanceof ApiClientError
              ? reason.message
              : "Chưa thể tải dữ liệu phân tích học tập. Vui lòng thử lại.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void syncOverview();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, isInstructor, reloadKey, windowDays]);

  const handleSelectWindow = (days: 7 | 30) => {
    if (days === windowDays) return;
    setLoading(true);
    setError(null);
    setInstructorOnlyNotice(false);
    setWindowDays(days);
  };

  const handleRetryOverview = () => {
    setLoading(true);
    setError(null);
    setInstructorOnlyNotice(false);
    setReloadKey((prev) => prev + 1);
  };

  const handleToggleCourseDetail = async (courseId: string) => {
    if (selectedCourseId === courseId) {
      setSelectedCourseId(null);
      setCourseDetailError(null);
      return;
    }

    setSelectedCourseId(courseId);
    setCourseDetailError(null);

    if (courseDetailById[courseId]) {
      return;
    }

    setCourseDetailLoadingId(courseId);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const detail = await fetchStudentCourseAnalytics(token, courseId);
      setCourseDetailById((prev) => ({ ...prev, [courseId]: detail }));
    } catch (reason: unknown) {
      setCourseDetailError(
        reason instanceof ApiClientError
          ? reason.message
          : "Không thể tải chi tiết kết quả khóa học. Vui lòng thử lại.",
      );
    } finally {
      setCourseDetailLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div role="status" aria-label="Đang tải phân tích học tập" className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="skeleton h-28 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
        </div>
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="skeleton h-72 rounded-xl xl:col-span-7" />
          <div className="skeleton h-72 rounded-xl xl:col-span-5" />
        </div>
        <div className="skeleton h-56 rounded-xl" />
      </div>
    );
  }

  if (instructorOnlyNotice) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-bold text-[#101a2c]">
          Tài khoản Giảng viên chưa có hồ sơ học viên
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#667085]">
          Trang này hiển thị số liệu học tập cá nhân của học viên. Để xem báo cáo khóa học bạn đang
          giảng dạy, hãy chuyển sang khu vực Giảng viên.
        </p>
        <Link
          href="/instructor/analytics"
          className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          <span>Mở phân tích Giảng viên</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-white p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <p className="mt-3 font-semibold text-[#101a2c]">Chưa thể tải phân tích học tập</p>
        <p className="mt-1.5 text-sm text-[#667085]">{error}</p>
        <button
          type="button"
          onClick={handleRetryOverview}
          className="focus-ring mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!overview || overview.summary.activeCourseCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-white p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-primary">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#101a2c]">Chưa có dữ liệu phân tích học tập</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#667085]">
          Hãy đăng ký khóa học đầu tiên và hoàn thành bài giảng hoặc bài kiểm tra để theo dõi phong
          độ học tập của bạn tại đây.
        </p>
        <Link
          href="/courses"
          className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          <span>Khám phá khóa học</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const { summary, windowDailyActivity, scoreTrend, coursePerformances, focusItems } = overview;
  const maxDailyHours = Math.max(1, ...windowDailyActivity.map((item) => item.studyHours));
  const expandedCourseDetail = selectedCourseId ? courseDetailById[selectedCourseId] : undefined;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#667085]">
          Theo dõi nhịp độ học tập, kết quả kiểm tra và các nội dung bạn nên ưu tiên ôn tập.
        </p>

        <div
          role="group"
          aria-label="Chọn khoảng thời gian phân tích"
          className="inline-flex self-start rounded-lg border border-slate-200 bg-white p-1"
        >
          <button
            type="button"
            onClick={() => handleSelectWindow(7)}
            className={cn(
              "focus-ring rounded-md px-3 py-1.5 text-xs font-semibold transition",
              windowDays === 7
                ? "bg-primary text-white shadow-xs"
                : "text-[#667085] hover:text-[#101a2c]",
            )}
          >
            7 ngày gần nhất
          </button>
          <button
            type="button"
            onClick={() => handleSelectWindow(30)}
            className={cn(
              "focus-ring rounded-md px-3 py-1.5 text-xs font-semibold transition",
              windowDays === 30
                ? "bg-primary text-white shadow-xs"
                : "text-[#667085] hover:text-[#101a2c]",
            )}
          >
            30 ngày gần nhất
          </button>
        </div>
      </div>

      {/* Phase 3 Extensible Slot (EDU-127: ML Predictions & Recommendations) */}
      {predictionSlot ? (
        <div data-slot="ml-prediction-slot">{predictionSlot}</div>
      ) : overview?.prediction ? (
        <div
          data-slot="ml-prediction-slot"
          className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-r from-emerald-50/40 via-white to-slate-50/50 p-4 shadow-xs sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold",
                  overview.prediction.badgeColor === "emerald"
                    ? "bg-emerald-100 text-emerald-700"
                    : overview.prediction.badgeColor === "amber"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-700",
                )}
              >
                <Award className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#101a2c]">
                    Khả năng nhận chứng chỉ
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                      overview.prediction.badgeColor === "emerald"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : overview.prediction.badgeColor === "amber"
                          ? "border border-amber-200 bg-amber-50 text-amber-800"
                          : "border border-rose-200 bg-rose-50 text-rose-700",
                    )}
                  >
                    {overview.prediction.statusBadge}
                  </span>
                  {overview.prediction.primaryFactorLabel ? (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-[#667085]">
                      {overview.prediction.primaryFactorLabel}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#667085]">
                  <span>
                    Xác suất:{" "}
                    <strong className="text-[#101a2c]">
                      {overview.prediction.completionPercentage}%
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Dự kiến hoàn thành:{" "}
                    <strong className="text-[#101a2c]">
                      {overview.prediction.estimatedCompletionDate}
                    </strong>
                  </span>
                  {overview.prediction.priorityActionTitle ? (
                    <>
                      <span>•</span>
                      <span className="font-medium text-[#101a2c]">
                        Ưu tiên: {overview.prediction.priorityActionTitle}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {overview.prediction.priorityActionHref ? (
              <Link
                href={overview.prediction.priorityActionHref}
                className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-primary/90 focus-visible:outline-none"
              >
                <span>{overview.prediction.priorityActionLabel || "Tiếp tục học"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 4 Core KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#667085]">Điểm trung bình</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-primary">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101a2c] tabular-nums">
            {summary.overallAverageScoreOutOf10 !== null
              ? `${summary.overallAverageScoreOutOf10.toFixed(1)}/10`
              : "Chưa có điểm"}
          </p>
          <p className="mt-1 text-xs text-[#667085]">
            {summary.attemptedQuizzesCount > 0 || summary.averageAssignmentScoreOutOf10 !== null
              ? [
                  summary.averageQuizScoreOutOf10 !== null
                    ? `Quiz ${summary.averageQuizScoreOutOf10.toFixed(1)}`
                    : null,
                  summary.averageAssignmentScoreOutOf10 !== null
                    ? `Bài tập ${summary.averageAssignmentScoreOutOf10.toFixed(1)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Chưa có bài đánh giá nào được chấm"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#667085]">Tiến độ lộ trình</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101a2c] tabular-nums">
            {summary.completionRate}%
          </p>
          <p className="mt-1 text-xs text-[#667085]">
            {summary.completedLessons}/{summary.totalLessons} bài học · {summary.activeCourseCount}{" "}
            khóa
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#667085]">Chuỗi học tập</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101a2c] tabular-nums">
            {summary.currentStreakDays}{" "}
            <span className="text-sm font-medium text-amber-600">ngày</span>
          </p>
          <p className="mt-1 text-xs text-[#667085]">
            Kỷ lục dài nhất: {summary.longestStreakDays} ngày
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#667085]">
              Thời lượng ({overview.windowDays} ngày)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#101a2c] tabular-nums">
            {summary.estimatedStudyHoursInWindow.toFixed(1)}{" "}
            <span className="text-sm font-medium text-[#667085]">giờ</span>
          </p>
          <p className="mt-1 text-xs text-[#667085]">
            {summary.activeDaysInWindow}/{overview.windowDays} ngày có học ·{" "}
            {summary.completedLessonsInWindow} bài xong
          </p>
        </div>
      </section>

      {/* 2 Core Charts: Daily Study Rhythm & Score Trend */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Daily Activity Chart */}
        <section className="portal-card xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#101a2c]">
                Nhịp học {overview.windowDays} ngày gần nhất
              </h2>
              <p className="mt-0.5 text-xs text-[#667085]">
                Ước lượng thời gian học tập và số bài hoàn thành theo giờ Việt Nam (+07:00)
              </p>
            </div>
            <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 tabular-nums">
              {summary.activeDaysInWindow}/{overview.windowDays} ngày tích cực
            </span>
          </div>

          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <div
              className={cn(
                "grid h-44 items-end border-b border-dashed border-slate-200 pb-2",
                overview.windowDays === 7
                  ? "grid-cols-7 gap-3"
                  : "grid-cols-15 gap-1.5 sm:grid-cols-30",
              )}
              style={
                overview.windowDays === 30
                  ? { gridTemplateColumns: `repeat(${windowDailyActivity.length}, minmax(0, 1fr))` }
                  : undefined
              }
            >
              {windowDailyActivity.map((day) => {
                const heightPercent =
                  day.studyHours > 0
                    ? Math.max(
                        12,
                        Math.min(100, Math.round((day.studyHours / maxDailyHours) * 100)),
                      )
                    : day.completedLessons > 0
                      ? 14
                      : 6;
                const hasActivity = day.studyMinutes > 0 || day.completedLessons > 0;
                return (
                  <div
                    key={day.date}
                    className="group relative flex h-full flex-col items-center justify-end"
                  >
                    <div className="pointer-events-none absolute -top-9 z-10 hidden whitespace-nowrap rounded-md bg-[#101a2c] px-2 py-1 text-[10px] font-medium text-white shadow-xs group-hover:block">
                      {day.fullLabel}: {day.studyHours.toFixed(1)}h · {day.completedLessons} bài
                    </div>
                    <div className="flex h-full w-full items-end justify-center">
                      <div
                        className={cn(
                          "w-full max-w-[28px] rounded-t-md transition-all",
                          hasActivity
                            ? day.today
                              ? "bg-primary shadow-xs"
                              : "bg-emerald-500/80 hover:bg-primary"
                            : "bg-slate-200/80",
                        )}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#667085]">
              <span>{windowDailyActivity[0]?.label ?? ""}</span>
              {overview.windowDays === 30 && windowDailyActivity[14] ? (
                <span>{windowDailyActivity[14].label}</span>
              ) : null}
              <span className="font-semibold text-primary">Hôm nay</span>
            </div>
          </div>
        </section>

        {/* Score Trend Chart */}
        <section className="portal-card xl:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#101a2c]">Xu hướng điểm số</h2>
              <p className="mt-0.5 text-xs text-[#667085]">
                Quiz (lần cao nhất) và bài tập đã chấm quy đổi thang /10
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>

          {scoreTrend.length === 0 ? (
            <div className="mt-5 flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <p className="text-sm font-semibold text-[#101a2c]">Chưa có dữ liệu điểm số</p>
              <p className="mt-1 text-xs text-[#667085]">
                Hoàn thành quiz hoặc chờ giảng viên chấm bài tập để xem biểu đồ xu hướng.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <ScoreTrendSvg points={scoreTrend} />
              <div className="flex items-center justify-between text-xs text-[#667085]">
                <span>
                  Tỷ lệ đạt quiz:{" "}
                  <strong className="text-[#101a2c]">
                    {summary.quizPassRate !== null ? `${summary.quizPassRate}%` : "Chưa có"}
                  </strong>
                </span>
                <span>
                  Đúng hạn bài tập:{" "}
                  <strong className="text-[#101a2c]">
                    {summary.submittedAssignmentsCount > 0
                      ? `${summary.onTimeAssignmentsCount}/${summary.submittedAssignmentsCount}`
                      : "Chưa nộp"}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Actionable Focus Items ("Cần ôn tập ngay") */}
      <section className="portal-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#101a2c]">Cần ôn tập & xử lý ngay</h2>
            <p className="mt-0.5 text-xs text-[#667085]">
              Gợi ý ưu tiên dựa trên quiz chưa đạt, bài tập sát/quá hạn và khóa học đang chững lại
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-[#101a2c] tabular-nums">
            {focusItems.length} mục
          </span>
        </div>

        {focusItems.length === 0 ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 text-center">
            <p className="text-sm font-semibold text-emerald-800">
              Phong độ rất tốt! Bạn chưa có nội dung tồn đọng cần xử lý gấp.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {focusItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5 transition hover:border-emerald-200 hover:bg-white"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        item.priority === "HIGH"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {item.priority === "HIGH" ? "Ưu tiên cao" : "Cần chú ý"}
                    </span>
                    <span className="truncate text-[11px] text-[#667085]">{item.courseTitle}</span>
                  </div>
                  <p className="truncate text-sm font-semibold text-[#101a2c]">{item.title}</p>
                  <p className="text-xs text-[#667085]">{item.description}</p>
                </div>

                <Link
                  href={item.actionHref}
                  className="focus-ring shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark"
                >
                  {item.actionLabel}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Per-Course Performance Table & Expandable Detail */}
      <section className="portal-card">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#101a2c]">Tổng hợp theo từng khóa học</h2>
            <p className="mt-0.5 text-xs text-[#667085]">
              Bấm “Xem chi tiết” để kiểm tra từng bài quiz và bài tập trong khóa học
            </p>
          </div>
          <BookOpen className="h-4 w-4 text-primary" />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-[#667085]">
                <th className="py-2.5 pr-4">Khóa học</th>
                <th className="py-2.5 px-3">Tiến độ</th>
                <th className="py-2.5 px-3">Quiz TB</th>
                <th className="py-2.5 px-3">Bài tập TB</th>
                <th className="py-2.5 pl-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coursePerformances.map((course) => {
                const isExpanded = selectedCourseId === course.courseId;
                return (
                  <tr key={course.courseId} className="align-middle">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/learning/courses/${course.courseId}`}
                        className="focus-ring font-semibold text-[#101a2c] hover:text-primary"
                      >
                        {course.courseTitle}
                      </Link>
                      <p className="text-xs text-[#667085]">
                        {course.completedLessons}/{course.totalLessons} bài học
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${course.completionPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#101a2c] tabular-nums">
                          {course.completionPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {course.bestQuizAverageOutOf10 !== null ? (
                        <span className="font-semibold text-[#101a2c] tabular-nums">
                          {course.bestQuizAverageOutOf10.toFixed(1)}/10{" "}
                          <span className="font-normal text-[#667085]">
                            ({course.passedQuizzesCount}/{course.totalQuizzesCount} đạt)
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#667085]">Chưa có dữ liệu</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {course.assignmentAverageOutOf10 !== null ? (
                        <span className="font-semibold text-[#101a2c] tabular-nums">
                          {course.assignmentAverageOutOf10.toFixed(1)}/10{" "}
                          <span className="font-normal text-[#667085]">
                            ({course.submittedAssignmentsCount}/{course.totalAssignmentsCount} nộp)
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#667085]">
                          {course.totalAssignmentsCount > 0
                            ? `${course.submittedAssignmentsCount}/${course.totalAssignmentsCount} đã nộp (chờ chấm)`
                            : "Không có bài tập"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleToggleCourseDetail(course.courseId)}
                        className="focus-ring inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#101a2c] transition hover:border-emerald-200 hover:text-primary"
                      >
                        <span>{isExpanded ? "Thu gọn" : "Xem chi tiết"}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Course Detail Panel */}
        {selectedCourseId ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
            {courseDetailLoadingId === selectedCourseId ? (
              <p className="text-xs font-medium text-[#667085]">
                Đang tải chi tiết kết quả khóa học...
              </p>
            ) : courseDetailError ? (
              <p className="text-xs font-medium text-rose-600">{courseDetailError}</p>
            ) : expandedCourseDetail ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Quiz Details */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#101a2c]">
                    Kết quả Quiz ({expandedCourseDetail.quizzes.length})
                  </h3>
                  {expandedCourseDetail.quizzes.length === 0 ? (
                    <p className="mt-2 text-xs text-[#667085]">Khóa học này chưa có bài quiz.</p>
                  ) : (
                    <ul className="mt-3 space-y-2.5">
                      {expandedCourseDetail.quizzes.map((q) => (
                        <li
                          key={q.quizId}
                          className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/learning/lessons/${q.lessonId}`}
                              className="focus-ring block truncate text-xs font-semibold text-[#101a2c] hover:text-primary"
                            >
                              {q.lessonTitle}
                            </Link>
                            <p className="text-[11px] text-[#667085]">
                              {q.attemptCount > 0
                                ? `Cao nhất ${q.bestScoreOutOf10?.toFixed(1)}/10 · Ngưỡng đạt ${q.passingScoreOutOf10.toFixed(1)}/10 · ${q.attemptCount} lần`
                                : `Chưa làm · Ngưỡng đạt ${q.passingScoreOutOf10.toFixed(1)}/10`}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              q.attemptCount === 0
                                ? "bg-slate-100 text-[#667085]"
                                : q.passed
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700",
                            )}
                          >
                            {q.attemptCount === 0 ? "Chưa làm" : q.passed ? "Đạt" : "Chưa đạt"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Assignment Details */}
                <div className="rounded-lg border border-slate-200/80 bg-white p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#101a2c]">
                    Bài tập tự luận ({expandedCourseDetail.assignments.length})
                  </h3>
                  {expandedCourseDetail.assignments.length === 0 ? (
                    <p className="mt-2 text-xs text-[#667085]">Khóa học này chưa có bài tập.</p>
                  ) : (
                    <ul className="mt-3 space-y-2.5">
                      {expandedCourseDetail.assignments.map((a) => (
                        <li
                          key={a.assignmentId}
                          className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#101a2c]">
                              {a.title}
                            </p>
                            <p className="text-[11px] text-[#667085]">
                              {a.scoreOutOf10 !== null && a.rawScore !== null
                                ? `Điểm: ${a.rawScore}/${a.maxScore} (${a.scoreOutOf10.toFixed(1)}/10)`
                                : a.submitted
                                  ? "Đã nộp · Đang chờ giảng viên chấm"
                                  : a.dueAt
                                    ? `Hạn nộp: ${new Intl.DateTimeFormat("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      }).format(new Date(a.dueAt))}`
                                    : "Chưa nộp bài"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              a.scoreOutOf10 !== null
                                ? "bg-emerald-50 text-emerald-700"
                                : a.submitted
                                  ? "bg-blue-50 text-blue-700"
                                  : a.late
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-amber-50 text-amber-700",
                            )}
                          >
                            {a.scoreOutOf10 !== null
                              ? "Đã chấm"
                              : a.submitted
                                ? "Chờ chấm"
                                : a.late
                                  ? "Quá hạn"
                                  : "Chưa nộp"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ScoreTrendSvg({ points }: { points: StudentLearningAnalyticsOverview["scoreTrend"] }) {
  const width = 420;
  const height = 170;
  const padX = 28;
  const padY = 18;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const coords = points.map((pt, index) => {
    const x =
      points.length === 1 ? padX + usableW / 2 : padX + (index / (points.length - 1)) * usableW;
    const clampedScore = Math.max(0, Math.min(10, pt.scoreOutOf10));
    const y = padY + usableH - (clampedScore / 10) * usableH;
    return { x, y, pt };
  });

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full overflow-visible"
        role="img"
        aria-label="Biểu đồ xu hướng điểm số trên thang 10"
      >
        {[0, 5, 10].map((tick) => {
          const y = padY + usableH - (tick / 10) * usableH;
          return (
            <g key={tick}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text x={4} y={y + 4} fontSize="10" fill="#667085">
                {tick}
              </text>
            </g>
          );
        })}

        {coords.length > 1 ? (
          <polyline
            fill="none"
            stroke="#20B486"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />
        ) : null}

        {coords.map(({ x, y, pt }) => (
          <g key={`${pt.assessmentType}-${pt.itemId}`}>
            <title>
              {`${pt.title}: ${pt.scoreOutOf10.toFixed(1)}/10 (${pt.assessmentType === "QUIZ" ? "Quiz" : "Bài tập"})`}
            </title>
            <circle
              cx={x}
              cy={y}
              r={4.5}
              fill={pt.passed ? "#20B486" : "#f43f5e"}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
