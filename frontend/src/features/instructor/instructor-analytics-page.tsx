"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  GraduationCap,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-client";
import { formatVNDAmount } from "@/lib/format";
import {
  fetchInstructorAnalyticsOverview,
  type InstructorAnalyticsOverview,
  type InstructorMonthlyTrend,
} from "@/lib/instructor-analytics-client";

type ChartView = "all" | "enrollments" | "revenue" | "completion";

const statusCopy = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đang xuất bản",
  ARCHIVED: "Đã lưu trữ",
} as const;

const statusStyle = {
  DRAFT: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  PUBLISHED: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  ARCHIVED: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
} as const;

export function InstructorAnalyticsPage() {
  const { accessToken, loading: authLoading } = useAuth();
  const [data, setData] = useState<InstructorAnalyticsOverview | null>(null);
  const [courseOptions, setCourseOptions] = useState<
    Array<{ courseId: string; courseTitle: string }>
  >([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [currentView, setCurrentView] = useState<ChartView>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTrend, setHoveredTrend] = useState<InstructorMonthlyTrend | null>(null);

  const triggerReload = useCallback(() => {
    setRefreshTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    const courseFilter = selectedCourseId || undefined;

    void Promise.resolve().then(async () => {
      if (!active) return;
      if (!accessToken) {
        setError("Vui lòng đăng nhập để xem số liệu phân tích.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const overview = await fetchInstructorAnalyticsOverview(accessToken, courseFilter);
        if (!active) return;
        setData(overview);
        setCourseOptions((prev) => {
          if (!courseFilter || prev.length === 0) {
            return overview.coursePerformances.map((c) => ({
              courseId: c.courseId,
              courseTitle: c.courseTitle,
            }));
          }
          return prev;
        });
      } catch {
        if (!active) return;
        setError("Không thể tải dữ liệu phân tích. Vui lòng thử lại sau.");
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [accessToken, authLoading, selectedCourseId, refreshTick]);

  const trends = useMemo(() => data?.monthlyTrends ?? [], [data]);
  const courses = useMemo(() => data?.coursePerformances ?? [], [data]);
  const summary = data?.summary ?? {
    totalStudents: 0,
    newStudentsThisMonth: 0,
    totalRevenue: 0,
    revenueThisMonth: 0,
    averageCompletionRate: 0,
    totalCertificates: 0,
    totalCompletedLessons: 0,
  };

  const handleExportCsv = () => {
    if (!data) return;

    const escapeCsv = (val: string | number) => `"${String(val).replaceAll('"', '""')}"`;

    const monthlyHeader = [
      "Tháng",
      "Học viên mới",
      "Hoàn thành",
      "Tỷ lệ hoàn thành (%)",
      "Doanh thu (VND)",
    ];
    const monthlyRows = data.monthlyTrends.map((t) => [
      t.label,
      t.newEnrollments,
      t.completedCount,
      `${t.completionRate}%`,
      t.revenue,
    ]);

    const courseHeader = [
      "Tên khóa học",
      "Trạng thái",
      "Giá bán (VND)",
      "Học viên",
      "Đã tốt nghiệp",
      "Tỷ lệ hoàn thành (%)",
      "Tổng bài học",
      "Doanh thu (VND)",
      "Đánh giá",
    ];
    const courseRows = data.coursePerformances.map((c) => [
      c.courseTitle,
      statusCopy[c.courseStatus] ?? c.courseStatus,
      c.price,
      c.studentCount,
      c.completedStudentsCount,
      `${c.completionRate}%`,
      c.totalLessons,
      c.revenue,
      c.averageRating,
    ]);

    const csvLines = [
      "BÁO CÁO PHÂN TÍCH SỐ LIỆU HỌC TẬP VÀ DOANH THU GIẢNG VIÊN",
      `Thời gian xuất: ${new Date().toLocaleString("vi-VN")}`,
      "",
      "--- SỐ LIỆU TỪNG THÁNG (12 THÁNG GẦN NHẤT) ---",
      monthlyHeader.map(escapeCsv).join(","),
      ...monthlyRows.map((row) => row.map(escapeCsv).join(",")),
      "",
      "--- HIỆU QUẢ TỪNG KHÓA HỌC ---",
      courseHeader.map(escapeCsv).join(","),
      ...courseRows.map((row) => row.map(escapeCsv).join(",")),
    ];

    const blob = new Blob(["\uFEFF" + csvLines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `edualto-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Monthly Revenue Chart coordinates
  const maxRevenue = useMemo(() => Math.max(...trends.map((t) => t.revenue), 100000), [trends]);
  // Monthly Enrollments Chart coordinates
  const maxEnrollments = useMemo(
    () => Math.max(...trends.map((t) => Math.max(t.newEnrollments, t.completedCount)), 5),
    [trends],
  );

  return (
    <div className="min-w-0 flex-1 px-4 py-5 sm:px-5 lg:px-6 lg:py-6 xl:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <TrendingUp className="size-4" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-heading">
              Phân tích số liệu học tập & Doanh thu
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Biểu đồ trực quan hóa số lượng học viên đăng ký mới, tỷ lệ hoàn thành khóa học và doanh
            thu từng tháng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Course Filter Dropdown */}
          <div className="relative min-w-[200px]">
            <select
              aria-label="Lọc theo khóa học"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="focus-ring h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-300"
            >
              <option value="">Tất cả khóa học</option>
              {courseOptions.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.courseTitle}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-2.5 size-4 text-slate-400"
              aria-hidden="true"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerReload}
            disabled={loading}
            className="focus-ring border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleExportCsv}
            disabled={loading || !data}
            className="focus-ring gap-1.5"
            title="Tải báo cáo số liệu CSV"
          >
            <Download className="size-4" />
            <span>Xuất CSV</span>
          </Button>
        </div>
      </header>

      {/* Error state */}
      {error ? (
        <div
          role="alert"
          className="mb-6 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerReload}
            className="border-rose-300 bg-white text-rose-800 hover:bg-rose-100"
          >
            Thử lại
          </Button>
        </div>
      ) : null}

      {/* KPI Cards Grid */}
      <section aria-label="Chỉ số tổng hợp" className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Doanh thu */}
          <article className="rounded-lg border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Tổng doanh thu
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="size-4.5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                <p className="text-xl font-bold tracking-tight text-heading sm:text-2xl">
                  {formatVNDAmount(summary.totalRevenue)}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                Tháng này: {formatVNDAmount(summary.revenueThisMonth)}
              </p>
            </div>
          </article>

          {/* Card 2: Học viên mới */}
          <article className="rounded-lg border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Học viên đăng ký
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Users className="size-4.5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-xl font-bold tracking-tight text-heading sm:text-2xl">
                  {summary.totalStudents.toLocaleString("vi-VN")}
                  <span className="ml-1 text-xs font-normal text-muted">học viên</span>
                </p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <span className="inline-block size-1.5 rounded-full bg-blue-500" />
                Tháng này: +{summary.newStudentsThisMonth} học viên mới
              </p>
            </div>
          </article>

          {/* Card 3: Tỷ lệ hoàn thành */}
          <article className="rounded-lg border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Tỷ lệ hoàn thành
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <GraduationCap className="size-4.5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold tracking-tight text-heading sm:text-2xl">
                    {summary.averageCompletionRate}%
                  </p>
                  <span className="text-xs text-emerald-600 font-medium">tiến độ chung</span>
                </div>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <span className="inline-block size-1.5 rounded-full bg-amber-500" />
                {summary.totalCompletedLessons.toLocaleString("vi-VN")} bài học đã hoàn tất
              </p>
            </div>
          </article>

          {/* Card 4: Chứng chỉ đã cấp */}
          <article className="rounded-lg border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Chứng chỉ đã cấp
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Award className="size-4.5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className="text-xl font-bold tracking-tight text-heading sm:text-2xl">
                  {summary.totalCertificates.toLocaleString("vi-VN")}
                  <span className="ml-1 text-xs font-normal text-muted">chứng chỉ</span>
                </p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <span className="inline-block size-1.5 rounded-full bg-purple-500" />
                Học viên hoàn thành 100% khóa học
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* Charts Section with Tabs */}
      <section aria-label="Biểu đồ trực quan hóa" className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-semibold text-heading">
              Biểu đồ trực quan hóa 12 tháng gần nhất
            </h2>
          </div>

          {/* Chart View Tabs */}
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setCurrentView("all")}
              className={`focus-ring rounded-md px-3 py-1.5 transition ${
                currentView === "all"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "hover:text-slate-900"
              }`}
            >
              Tất cả chỉ số
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("enrollments")}
              className={`focus-ring rounded-md px-3 py-1.5 transition ${
                currentView === "enrollments"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "hover:text-slate-900"
              }`}
            >
              Học viên mới
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("revenue")}
              className={`focus-ring rounded-md px-3 py-1.5 transition ${
                currentView === "revenue"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "hover:text-slate-900"
              }`}
            >
              Doanh thu
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("completion")}
              className={`focus-ring rounded-md px-3 py-1.5 transition ${
                currentView === "completion"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "hover:text-slate-900"
              }`}
            >
              Tỷ lệ hoàn thành
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 w-full rounded-lg" />
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Chart 1: Số lượng học viên đăng ký mới & Hoàn thành */}
            {(currentView === "all" ||
              currentView === "enrollments" ||
              currentView === "completion") && (
              <div
                className={`rounded-lg border border-slate-200 bg-white p-5 shadow-xs ${
                  currentView !== "all" ? "lg:col-span-2" : ""
                }`}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-heading">
                      Số lượng học viên đăng ký mới & Hoàn thành khóa học
                    </h3>
                    <p className="text-xs text-muted">Theo dõi theo từng tháng trong năm</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-xs bg-blue-600" />
                      Đăng ký mới
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-xs bg-primary" />
                      Hoàn thành (Cấp CC)
                    </span>
                  </div>
                </div>

                {trends.length === 0 ? (
                  <div className="flex h-56 flex-col items-center justify-center text-center text-xs text-muted">
                    Chưa có dữ liệu học viên trong 12 tháng gần nhất
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[480px]">
                      {/* SVG Bar Chart */}
                      <svg
                        viewBox="0 0 600 200"
                        preserveAspectRatio="none"
                        className="h-48 w-full overflow-visible"
                        aria-label="Biểu đồ số học viên đăng ký mới và hoàn thành"
                      >
                        {/* Horizontal Gridlines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                          const y = 170 - ratio * 140;
                          const val = Math.round(maxEnrollments * ratio);
                          return (
                            <g key={ratio}>
                              <line
                                x1="30"
                                x2="590"
                                y1={y}
                                y2={y}
                                stroke="#f1f5f9"
                                strokeDasharray="3 3"
                              />
                              <text x="5" y={y + 3} fontSize="9" fill="#94a3b8">
                                {val}
                              </text>
                            </g>
                          );
                        })}

                        {/* Bars for each month */}
                        {trends.map((item, idx) => {
                          const colWidth = 560 / trends.length;
                          const x = 35 + idx * colWidth;
                          const barW = Math.max(8, colWidth / 2 - 3);

                          const enrollHeight = (item.newEnrollments / maxEnrollments) * 140;
                          const compHeight = (item.completedCount / maxEnrollments) * 140;

                          return (
                            <g
                              key={item.month}
                              className="cursor-pointer transition-opacity hover:opacity-85"
                              onMouseEnter={() => setHoveredTrend(item)}
                              onMouseLeave={() => setHoveredTrend(null)}
                            >
                              <title>{`${item.label}: ${item.newEnrollments} đăng ký mới, ${item.completedCount} hoàn thành (${item.completionRate}%)`}</title>

                              {/* Bar 1: New Enrollments */}
                              <rect
                                x={x}
                                y={170 - enrollHeight}
                                width={barW}
                                height={Math.max(2, enrollHeight)}
                                rx="3"
                                fill="#2563eb"
                              />

                              {/* Bar 2: Completions */}
                              <rect
                                x={x + barW + 2}
                                y={170 - compHeight}
                                width={barW}
                                height={Math.max(2, compHeight)}
                                rx="3"
                                fill="#20b486"
                              />

                              {/* Month label */}
                              <text
                                x={x + barW}
                                y="188"
                                textAnchor="middle"
                                fontSize="9"
                                fill="#64748b"
                              >
                                {item.label.slice(0, 2)}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Tooltip banner */}
                      {hoveredTrend ? (
                        <div className="mt-2 flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-700 border border-slate-200">
                          <span className="font-semibold">{hoveredTrend.label}</span>
                          <div className="flex gap-4">
                            <span className="text-blue-700">
                              Đăng ký mới: <strong>{hoveredTrend.newEnrollments}</strong>
                            </span>
                            <span className="text-emerald-700">
                              Hoàn thành: <strong>{hoveredTrend.completedCount}</strong>
                            </span>
                            <span className="text-amber-700">
                              Tỷ lệ kỳ này: <strong>{hoveredTrend.completionRate}%</strong>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-center text-[11px] text-muted">
                          Rê chuột vào cột để xem chi tiết số liệu từng tháng.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chart 2: Doanh thu từng tháng */}
            {(currentView === "all" || currentView === "revenue") && (
              <div
                className={`rounded-lg border border-slate-200 bg-white p-5 shadow-xs ${
                  currentView !== "all" ? "lg:col-span-2" : ""
                }`}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-heading">
                      Doanh thu từng tháng (VND)
                    </h3>
                    <p className="text-xs text-muted">
                      Tổng doanh thu từ các đơn hàng đã thanh toán
                    </p>
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-primary">
                    Tổng 12 tháng: {formatVNDAmount(trends.reduce((acc, t) => acc + t.revenue, 0))}
                  </span>
                </div>

                {trends.length === 0 ? (
                  <div className="flex h-56 flex-col items-center justify-center text-center text-xs text-muted">
                    Chưa có giao dịch doanh thu trong 12 tháng gần nhất
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[480px]">
                      {/* SVG Line / Area Chart */}
                      <svg
                        viewBox="0 0 600 200"
                        preserveAspectRatio="none"
                        className="h-48 w-full overflow-visible"
                        aria-label="Biểu đồ doanh thu từng tháng"
                      >
                        <defs>
                          <linearGradient id="analytics-rev-grad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#20b486" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#20b486" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Y-axis grid */}
                        {[0, 0.33, 0.66, 1].map((ratio) => {
                          const y = 170 - ratio * 140;
                          const val = maxRevenue * ratio;
                          return (
                            <g key={ratio}>
                              <line
                                x1="55"
                                x2="590"
                                y1={y}
                                y2={y}
                                stroke="#f1f5f9"
                                strokeDasharray="3 3"
                              />
                              <text x="5" y={y + 3} fontSize="8" fill="#94a3b8">
                                {new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(
                                  val,
                                )}
                                đ
                              </text>
                            </g>
                          );
                        })}

                        {/* Area & Line */}
                        {(() => {
                          const points = trends.map((item, idx) => {
                            const x = 55 + (idx * 535) / Math.max(1, trends.length - 1);
                            const y = 170 - (item.revenue / maxRevenue) * 140;
                            return { x, y, item };
                          });

                          const pathData = points
                            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                            .join(" ");
                          const areaData = `${pathData} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`;

                          return (
                            <>
                              <path d={areaData} fill="url(#analytics-rev-grad)" />
                              <path
                                d={pathData}
                                fill="none"
                                stroke="#20b486"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              {points.map((p) => (
                                <g
                                  key={p.item.month}
                                  className="cursor-pointer group"
                                  onMouseEnter={() => setHoveredTrend(p.item)}
                                  onMouseLeave={() => setHoveredTrend(null)}
                                >
                                  <title>{`${p.item.label}: ${formatVNDAmount(p.item.revenue)}`}</title>
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="4"
                                    fill="#ffffff"
                                    stroke="#20b486"
                                    strokeWidth="2.5"
                                    className="transition-transform group-hover:scale-125"
                                  />
                                  <text
                                    x={p.x}
                                    y="188"
                                    textAnchor="middle"
                                    fontSize="9"
                                    fill="#64748b"
                                  >
                                    {p.item.label.slice(0, 2)}
                                  </text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>

                      {hoveredTrend ? (
                        <div className="mt-2 flex items-center justify-between rounded-md bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900 border border-emerald-200">
                          <span className="font-semibold">{hoveredTrend.label}</span>
                          <span>
                            Doanh thu thực: <strong>{formatVNDAmount(hoveredTrend.revenue)}</strong>
                          </span>
                        </div>
                      ) : (
                        <p className="mt-2 text-center text-[11px] text-muted">
                          Rê chuột vào điểm dữ liệu để xem doanh thu chi tiết từng tháng.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Course Performance Breakdown Table */}
      <section aria-label="Hiệu quả từng khóa học" className="space-y-3 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-semibold text-heading">
              Thống kê chi tiết & Tỷ lệ hoàn thành theo khóa học
            </h2>
          </div>
          <span className="text-xs text-muted">{courses.length} khóa học đang hiển thị</span>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-700">
                <tr>
                  <th scope="col" className="px-4 py-3 sm:px-6">
                    Khóa học
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Giá bán
                  </th>
                  <th scope="col" className="px-3 py-3 text-center">
                    Học viên
                  </th>
                  <th scope="col" className="px-4 py-3 min-w-[160px]">
                    Tỷ lệ hoàn thành
                  </th>
                  <th scope="col" className="px-3 py-3 text-center">
                    Chứng chỉ
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Doanh thu
                  </th>
                  <th scope="col" className="px-3 py-3 text-center">
                    Đánh giá
                  </th>
                  <th scope="col" className="px-4 py-3 text-center">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={9} className="px-6 py-4">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                ) : courses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-sm text-muted">
                      Chưa có khóa học nào để hiển thị dữ liệu phân tích.
                    </td>
                  </tr>
                ) : (
                  courses.map((course) => (
                    <tr key={course.courseId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 sm:px-6">
                        <Link
                          href={`/instructor/courses/${encodeURIComponent(course.courseId)}/overview`}
                          className="focus-ring font-medium text-slate-900 hover:text-primary transition-colors line-clamp-1 max-w-[260px]"
                          title={course.courseTitle}
                        >
                          {course.courseTitle}
                        </Link>
                        <p className="text-[11px] text-muted">
                          {course.totalLessons} bài học trong chương trình
                        </p>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            statusStyle[course.courseStatus] ?? "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {statusCopy[course.courseStatus] ?? course.courseStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right whitespace-nowrap font-medium text-slate-700">
                        {course.price === 0 ? "Miễn phí" : formatVNDAmount(course.price)}
                      </td>
                      <td className="px-3 py-3.5 text-center whitespace-nowrap font-semibold text-slate-900">
                        {course.studentCount.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-900">
                              {course.completionRate}%
                            </span>
                            <span className="text-muted">
                              {course.completedStudentsCount} tốt nghiệp
                            </span>
                          </div>
                          <div
                            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                            role="progressbar"
                            aria-valuenow={course.completionRate}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${Math.min(100, course.completionRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          <strong>{course.completedStudentsCount}</strong>
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right whitespace-nowrap font-semibold text-emerald-700">
                        {formatVNDAmount(course.revenue)}
                      </td>
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                          ★ {course.averageRating.toFixed(1)}
                          <span className="text-[10px] font-normal text-muted">
                            ({course.reviewCount})
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Link
                          href={`/instructor/courses/${encodeURIComponent(course.courseId)}/overview`}
                          className="focus-ring inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
                        >
                          <span>Quản lý</span>
                          <ExternalLink className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
