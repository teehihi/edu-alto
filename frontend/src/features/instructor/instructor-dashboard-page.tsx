"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  BookOpen,
  ChartNoAxesCombined,
  CircleAlert,
  MoreHorizontal,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-client";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";
import { ApiClientError } from "@/lib/api";
import { courseDescriptionToText } from "@/lib/course-description";
import {
  fetchInstructorRevenueSummary,
  type InstructorRevenueSummary,
} from "@/lib/instructor-revenue-client";
import { fetchInstructorReviewSummary, type InstructorReviewSummary } from "@/lib/review-client";
import {
  archiveInstructorCourse,
  createInstructorCourse,
  deleteDraftInstructorCourse,
  fetchInstructorCourses,
  publishInstructorCourse,
  updateInstructorCourse,
  type InstructorCourse,
  type InstructorCourseLevel,
  type InstructorCoursePayload,
  type InstructorCourseStatus,
} from "@/lib/instructor-course-client";
import {
  fetchInstructorCourseMetrics,
  indexInstructorCourseMetrics,
  type InstructorCourseMetrics,
} from "@/lib/instructor-course-metrics-client";

const statusCopy: Record<InstructorCourseStatus, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đang xuất bản",
  ARCHIVED: "Đã lưu trữ",
};

const statusStyle: Record<InstructorCourseStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-800 ring-amber-200",
  PUBLISHED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ARCHIVED: "bg-slate-100 text-slate-700 ring-slate-200",
};

const ratingBuckets = ["Tổng đánh giá", "1 sao", "2 sao", "3 sao", "4 sao", "5 sao"];

function formatPrice(price: number): string {
  if (price === 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  })
    .format(price)
    .replace("₫", "đ");
}

function CourseCard({
  course,
  stats,
  onEdit,
  onArchive,
  onDelete,
  onPublish,
}: {
  course: InstructorCourse;
  stats: InstructorCourseMetrics | null;
  onEdit: (course: InstructorCourse) => void;
  onArchive: (course: InstructorCourse) => void;
  onDelete: (course: InstructorCourse) => void;
  onPublish: (course: InstructorCourse) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const badge =
    course.price === 0
      ? { label: "Miễn phí", className: "bg-slate-100 text-slate-800" }
      : course.originalPrice && course.originalPrice > course.price
        ? { label: "Giảm giá", className: "bg-slate-100 text-slate-800" }
        : course.status === "PUBLISHED"
          ? { label: "Đang xuất bản", className: "bg-primary text-white" }
          : { label: statusCopy[course.status], className: statusStyle[course.status] };

  const metrics = [
    [formatPrice(course.price), "Giá"],
    [stats ? stats.certificateCount.toLocaleString("vi-VN") : "—", "Chứng chỉ"],
    [stats ? stats.chapterCount.toLocaleString("vi-VN") : "—", "Chương"],
    [stats ? stats.publicReviewCount.toLocaleString("vi-VN") : "—", "Đánh giá"],
    [stats ? stats.paidOrderCount.toLocaleString("vi-VN") : "—", "Đơn hàng"],
    [stats ? stats.wishlistCount.toLocaleString("vi-VN") : "—", "Thêm vào kệ"],
  ];

  return (
    <article className="relative rounded-lg border border-slate-200 bg-white p-3 shadow-[0_0_8px_rgba(59,130,246,0.12)] sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${badge.className}`}>
          {badge.label}
        </span>
        <div className="relative">
          <button
            type="button"
            aria-label={`Tùy chọn khóa học ${course.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="focus-ring inline-flex size-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 active:bg-slate-200"
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
            >
              <Link
                role="menuitem"
                href={`/instructor/courses/${encodeURIComponent(course.id)}/overview`}
                onClick={() => setMenuOpen(false)}
                className="focus-ring flex min-h-9 items-center rounded px-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Quản lý khóa học
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(course);
                }}
                className="focus-ring flex min-h-9 w-full items-center rounded px-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Chỉnh sửa
              </button>
              {course.status === "DRAFT" ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onPublish(course);
                    }}
                    className="focus-ring flex min-h-9 w-full items-center rounded px-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Xuất bản
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(course);
                    }}
                    className="focus-ring flex min-h-9 w-full items-center rounded px-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                  >
                    Xóa bản nháp
                  </button>
                </>
              ) : course.status === "PUBLISHED" ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onArchive(course);
                  }}
                  className="focus-ring flex min-h-9 w-full items-center rounded px-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                >
                  Lưu trữ
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <Link
        href={`/instructor/courses/${encodeURIComponent(course.id)}/overview`}
        className="focus-ring mt-1 block rounded-sm text-base font-semibold leading-6 text-primary hover:text-[#159e75]"
      >
        {course.title}
      </Link>
      <div className="mt-2 grid grid-flow-col grid-cols-3 grid-rows-2 gap-y-2 border-t border-slate-100 pt-2">
        {metrics.map(([value, label]) => (
          <div key={label} className="min-w-0">
            <p className="truncate text-sm font-semibold leading-5 text-slate-900">{value}</p>
            <p className="truncate text-[10px] leading-4 text-slate-600">{label}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

const levelLabels: Record<InstructorCourseLevel, string> = {
  ALL_LEVELS: "Mọi trình độ",
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

const emptyCourseForm: InstructorCoursePayload = {
  title: "",
  tagline: "",
  description: "",
  price: 0,
  originalPrice: null,
  level: "ALL_LEVELS",
  language: "vi",
  subtitleLanguages: [],
  thumbnailKey: null,
};

let instructorDashboardCache: {
  courses: InstructorCourse[];
  reviewSummary: InstructorReviewSummary | null;
  revenueSummary: InstructorRevenueSummary | null;
} | null = null;

export function clearInstructorDashboardCache() {
  instructorDashboardCache = null;
}

export function InstructorDashboardPage() {
  const router = useRouter();
  const { accessToken, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState<InstructorCourse[]>(
    () => instructorDashboardCache?.courses ?? [],
  );
  const [courseStats, setCourseStats] = useState<Record<string, InstructorCourseMetrics>>({});
  const [reviewSummary, setReviewSummary] = useState<InstructorReviewSummary | null>(
    () => instructorDashboardCache?.reviewSummary ?? null,
  );
  const [revenueSummary, setRevenueSummary] = useState<InstructorRevenueSummary | null>(
    () => instructorDashboardCache?.revenueSummary ?? null,
  );
  const [revenueSummaryLoading, setRevenueSummaryLoading] = useState(false);
  const [revenueSummaryAvailable, setRevenueSummaryAvailable] = useState(true);
  const [reviewSummaryLoading, setReviewSummaryLoading] = useState(false);
  const [reviewSummaryAvailable, setReviewSummaryAvailable] = useState(true);
  const [loading, setLoading] = useState(() => !instructorDashboardCache);
  const [error, setError] = useState<string | null>(null);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<InstructorCourse | null>(null);
  const [courseForm, setCourseForm] = useState<InstructorCoursePayload>(emptyCourseForm);
  const [courseFormError, setCourseFormError] = useState<string | null>(null);
  const [courseFormLoading, setCourseFormLoading] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<InstructorCourse | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InstructorCourse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [publishTarget, setPublishTarget] = useState<InstructorCourse | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [dashboardOptionsOpen, setDashboardOptionsOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (authLoading) return;
    if (!accessToken) {
      setError("Vui lòng đăng nhập để xem khóa học của bạn.");
      setLoading(false);
      setReviewSummaryAvailable(false);
      setRevenueSummaryAvailable(false);
      return;
    }
    if (!instructorDashboardCache || instructorDashboardCache.courses.length === 0) {
      setLoading(true);
    }
    setError(null);
    setReviewSummaryLoading(true);
    setRevenueSummaryLoading(true);

    try {
      const [coursesRes, metricsRes, reviewRes, revenueRes] = await Promise.allSettled([
        fetchInstructorCourses(accessToken),
        fetchInstructorCourseMetrics(accessToken),
        fetchInstructorReviewSummary(accessToken),
        fetchInstructorRevenueSummary(accessToken, {}),
      ]);

      let fetchedCourses: InstructorCourse[] = [];
      if (coursesRes.status === "fulfilled") {
        fetchedCourses = coursesRes.value.data;
        setCourses(fetchedCourses);
      } else {
        setError(
          coursesRes.reason instanceof ApiClientError
            ? coursesRes.reason.message
            : "Không thể tải danh sách khóa học. Vui lòng thử lại.",
        );
      }

      if (metricsRes.status === "fulfilled" && fetchedCourses.length > 0) {
        setCourseStats(indexInstructorCourseMetrics(metricsRes.value));
      } else {
        setCourseStats({});
      }

      let nextReview: InstructorReviewSummary | null = null;
      if (reviewRes.status === "fulfilled" && fetchedCourses.length > 0) {
        nextReview = reviewRes.value;
        setReviewSummary(nextReview);
        setReviewSummaryAvailable(true);
      } else {
        setReviewSummary(null);
        setReviewSummaryAvailable(Boolean(accessToken) && coursesRes.status === "fulfilled");
      }

      let nextRevenue: InstructorRevenueSummary | null = null;
      if (revenueRes.status === "fulfilled") {
        nextRevenue = revenueRes.value;
        setRevenueSummary(nextRevenue);
        setRevenueSummaryAvailable(true);
      } else {
        setRevenueSummary(null);
        setRevenueSummaryAvailable(false);
      }

      if (coursesRes.status === "fulfilled") {
        instructorDashboardCache = {
          courses: fetchedCourses,
          reviewSummary: nextReview,
          revenueSummary: nextRevenue,
        };
      }
    } finally {
      setLoading(false);
      setReviewSummaryLoading(false);
      setRevenueSummaryLoading(false);
    }
  }, [accessToken, authLoading]);

  const loadCourses = loadDashboardData;

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const revenueMetrics = [
    {
      title: "Doanh thu khóa học đã thanh toán",
      value: revenueSummary
        ? `${new Intl.NumberFormat("vi-VN").format(revenueSummary.paidNetAmount)}đ`
        : "—",
      detail: "Sau ưu đãi, trước phí nền tảng",
      icon: ChartNoAxesCombined,
    },
    {
      title: "Giao dịch đã thanh toán",
      value: revenueSummary?.paidTransactionCount.toLocaleString("vi-VN") ?? "—",
      detail: "Tính theo từng khóa học trong đơn",
      icon: ChartNoAxesCombined,
    },
    {
      title: "Đơn hàng đang chờ",
      value: revenueSummary?.pendingTransactionCount.toLocaleString("vi-VN") ?? "—",
      detail: "Chờ thanh toán hoặc xác nhận",
      icon: ChartNoAxesCombined,
    },
  ];

  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm(emptyCourseForm);
    setCourseFormError(null);
    setActionError(null);
    setCourseFormOpen(true);
  };

  const openEditCourse = (course: InstructorCourse) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      slug: course.slug,
      tagline: course.tagline ?? "",
      description: course.description ?? "",
      price: course.price,
      originalPrice: course.originalPrice,
      level: course.level,
      language: course.language,
      thumbnailKey: course.thumbnailKey,
    });
    setCourseFormError(null);
    setActionError(null);
    setCourseFormOpen(true);
  };

  const saveCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      setCourseFormError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }
    const title = courseForm.title.trim();
    const description = courseForm.description.trim();
    if (!title || !courseDescriptionToText(description)) {
      setCourseFormError("Vui lòng nhập tên và mô tả khóa học.");
      return;
    }
    if (courseForm.price < 0 || (courseForm.originalPrice ?? 0) < 0) {
      setCourseFormError("Giá khóa học không được âm.");
      return;
    }
    setCourseFormLoading(true);
    setCourseFormError(null);
    const payload: InstructorCoursePayload = {
      ...courseForm,
      title,
      description,
      tagline: courseForm.tagline?.trim() || null,
      originalPrice: courseForm.originalPrice === null ? null : Number(courseForm.originalPrice),
      price: Number(courseForm.price),
    };
    try {
      if (editingCourse) {
        await updateInstructorCourse(editingCourse.id, payload, accessToken);
      } else {
        const createdCourse = await createInstructorCourse(payload, accessToken);
        setCourseFormOpen(false);
        router.push(`/instructor/courses/${encodeURIComponent(createdCourse.id)}/details`);
        return;
      }
      setCourseFormOpen(false);
      await loadCourses();
    } catch (cause) {
      setCourseFormError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể lưu khóa học. Vui lòng thử lại.",
      );
    } finally {
      setCourseFormLoading(false);
    }
  };

  const archiveCourse = async () => {
    if (!archiveTarget || !accessToken) return;
    setArchiveLoading(true);
    setActionError(null);
    try {
      await archiveInstructorCourse(archiveTarget.id, accessToken);
      setArchiveTarget(null);
      await loadCourses();
    } catch (cause) {
      setActionError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể lưu trữ khóa học. Vui lòng thử lại.",
      );
      setArchiveTarget(null);
    } finally {
      setArchiveLoading(false);
    }
  };

  const deleteDraftCourse = async () => {
    if (!deleteTarget || !accessToken) return;
    setDeleteLoading(true);
    setActionError(null);
    try {
      await deleteDraftInstructorCourse(deleteTarget.id, accessToken);
      setDeleteTarget(null);
      await loadCourses();
    } catch (cause) {
      setActionError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể xóa bản nháp. Vui lòng thử lại.",
      );
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const requestPublishCourse = async () => {
    if (!publishTarget || !accessToken) return;
    setPublishError(null);
    if (!publishTarget.title.trim()) {
      setPublishError("Vui lòng nhập tên khóa học trước khi xuất bản.");
      return;
    }
    if (!courseDescriptionToText(publishTarget.description ?? "")) {
      setPublishError("Vui lòng bổ sung mô tả khóa học trước khi xuất bản.");
      return;
    }
    if (!Number.isFinite(publishTarget.price) || publishTarget.price < 0) {
      setPublishError("Giá khóa học không hợp lệ. Vui lòng cập nhật trước khi xuất bản.");
      return;
    }

    setPublishLoading(true);
    try {
      await publishInstructorCourse(publishTarget.id, accessToken);
      setPublishTarget(null);
      await loadCourses();
    } catch (cause) {
      setPublishError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể xuất bản khóa học. Vui lòng thử lại.",
      );
    } finally {
      setPublishLoading(false);
    }
  };

  function downloadCourseList() {
    if (courses.length === 0) return;
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [
      ["Tên khóa học", "Trạng thái", "Giá", "Ngày cập nhật"],
      ...courses.map((course) => [
        course.title,
        statusCopy[course.status],
        String(course.price),
        course.updatedAt,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "khoa-hoc-giang-vien.csv";
    link.click();
    URL.revokeObjectURL(url);
    setDashboardOptionsOpen(false);
  }

  return (
    <InstructorWorkspaceShell activeSection="dashboard">
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-6 xl:pr-[38px] xl:pl-[61px]">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-primary">Tổng quan</h1>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button type="button" variant="primary" onClick={openCreateCourse}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Thêm khóa học
            </Button>
            <div className="relative">
              <button
                type="button"
                aria-label="Tùy chọn tổng quan"
                aria-expanded={dashboardOptionsOpen}
                aria-haspopup="menu"
                onClick={() => setDashboardOptionsOpen((open) => !open)}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-200 active:bg-slate-300"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
              {dashboardOptionsOpen ? (
                <div
                  role="menu"
                  aria-label="Tùy chọn tổng quan"
                  className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={courses.length === 0}
                    onClick={downloadCourseList}
                    className="focus-ring flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Tải danh sách khóa học (CSV)
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section
          aria-label="Doanh thu khóa học"
          className="grid gap-4 xl:grid-cols-[minmax(280px,378px)_minmax(0,1fr)]"
        >
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {revenueMetrics.map(({ title, value, detail, icon: Icon }) => (
              <article
                key={title}
                className="flex min-h-[88px] items-center gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm xl:min-h-[116px]"
              >
                <Icon
                  className="h-9 w-9 shrink-0 text-primary"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div>
                  <span className="text-lg font-semibold text-ink" aria-live="polite">
                    {revenueSummaryLoading && revenueSummary === null
                      ? "…"
                      : revenueSummaryAvailable
                        ? value
                        : "—"}
                  </span>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{title}</p>
                  <p className="text-[11px] text-muted">
                    {revenueSummaryAvailable ? detail : "Dữ liệu doanh thu hiện chưa sẵn có"}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <section
            className="flex min-h-[280px] flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:min-h-[340px] xl:min-h-[390px]"
            aria-labelledby="sales-heading"
          >
            <div className="flex items-center justify-between">
              <h2 id="sales-heading" className="text-lg font-semibold text-slate-900">
                Doanh số
              </h2>
              <span className="text-xs text-muted">Đơn vị: đ</span>
            </div>
            <div className="flex flex-1 flex-col justify-center">
              {revenueSummaryLoading ? (
                <p className="text-center text-sm text-slate-500">Đang tải doanh thu…</p>
              ) : !revenueSummaryAvailable || !revenueSummary ? (
                <p className="text-center text-sm text-slate-500">
                  Chưa có dữ liệu doanh thu để hiển thị.
                </p>
              ) : (revenueSummary.periods ?? []).every((period) => period.netAmount === 0) ? (
                <div className="flex flex-col items-center text-center">
                  <ChartNoAxesCombined className="h-9 w-9 text-slate-300" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    Chưa có giao dịch đã thanh toán
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
                    Biểu đồ theo dõi 12 tháng gần nhất.
                  </p>
                </div>
              ) : (
                <div
                  role="img"
                  aria-label="Doanh thu khóa học đã thanh toán trong 12 tháng gần nhất"
                  className="flex h-48 items-end gap-2 overflow-x-auto pb-1"
                >
                  {(revenueSummary.periods ?? []).map((period) => {
                    const maximum = Math.max(
                      ...(revenueSummary.periods ?? []).map((entry) => entry.netAmount),
                    );
                    const height =
                      maximum === 0 ? 0 : Math.max(3, (period.netAmount / maximum) * 130);
                    return (
                      <div
                        key={period.label}
                        className="flex h-full min-w-[28px] flex-1 flex-col justify-end"
                      >
                        <div
                          title={`${period.label}: ${new Intl.NumberFormat("vi-VN").format(period.netAmount)}đ`}
                          className="mx-auto w-full max-w-7 rounded-t bg-primary/80 hover:bg-primary"
                          style={{ height: `${height}px` }}
                        />
                        <span className="mt-2 truncate text-center text-[9px] text-slate-500">
                          {period.label.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </section>

        <section className="mt-8" aria-labelledby="rating-heading">
          <h2 id="rating-heading" className="mb-3 text-base font-semibold text-slate-900">
            Đánh giá
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {ratingBuckets.map((label, index) => {
              const value =
                index === 0
                  ? (reviewSummary?.reviewCount ?? 0)
                  : (reviewSummary?.ratingCounts?.find((item) => item.rating === index)?.count ??
                    0);
              const displayValue =
                loading || reviewSummaryLoading
                  ? "…"
                  : reviewSummaryAvailable
                    ? value.toLocaleString("vi-VN")
                    : "—";
              const badgeColors = [
                "",
                "bg-rose-500",
                "bg-amber-500",
                "bg-yellow-400",
                "bg-emerald-400",
                "bg-emerald-600",
              ];
              return (
                <article
                  key={label}
                  className="min-h-[76px] rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <p className="text-xs text-slate-600">{label}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xl font-semibold text-slate-900">{displayValue}</span>
                    {index > 0 ? (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${badgeColors[index]}`}
                      >
                        {index.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  {!reviewSummaryLoading && !reviewSummaryAvailable ? (
                    <p className="text-[10px] text-muted">Chưa tải được thống kê</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="courses-heading"
          className="mt-8 scroll-mt-6 pb-8"
          aria-labelledby="courses-heading-title"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="courses-heading-title" className="text-base font-semibold text-slate-900">
              Khóa học
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                {loading ? "Đang tải…" : `${courses.length} khóa học`}
              </span>
              {courses.length > 3 ? (
                <Link
                  href="/instructor/courses/overview"
                  className="focus-ring rounded text-xs font-semibold text-primary hover:underline"
                >
                  Xem tất cả
                </Link>
              ) : null}
            </div>
          </div>

          {actionError ? (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            >
              {actionError}
            </p>
          ) : null}

          {loading ? (
            <div
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              aria-label="Đang tải danh sách khóa học"
              aria-busy="true"
            >
              <Skeleton className="h-52 rounded-lg" />
              <Skeleton className="h-52 rounded-lg" />
              <Skeleton className="h-52 rounded-lg" />
            </div>
          ) : error ? (
            <section role="alert" className="rounded-lg border border-rose-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-ink">Chưa thể tải khóa học</h3>
                  <p className="mt-1 text-sm text-muted">{error}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => void loadCourses()}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Thử lại
                  </Button>
                </div>
              </div>
            </section>
          ) : courses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-ink">Bạn chưa có khóa học nào</h3>
              <p className="mt-1 text-sm text-muted">
                Khóa học của bạn sẽ xuất hiện tại đây sau khi được tạo.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {courses.slice(0, 3).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  stats={courseStats[course.id] ?? null}
                  onEdit={openEditCourse}
                  onArchive={setArchiveTarget}
                  onDelete={setDeleteTarget}
                  onPublish={(course) => {
                    setPublishError(null);
                    setPublishTarget(course);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {courseFormOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-form-title"
            className="my-auto max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-7"
          >
            <div className="mb-5">
              <h2 id="course-form-title" className="text-xl font-semibold text-heading">
                {editingCourse ? "Chỉnh sửa khóa học" : "Tạo khóa học mới"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {editingCourse?.status === "PUBLISHED"
                  ? "Cập nhật thông tin hiển thị của khóa học."
                  : "Tạo bản nháp trước, sau đó bổ sung chương và bài học."}
              </p>
            </div>
            <form className="space-y-4" onSubmit={saveCourse}>
              {courseFormError ? (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
                >
                  {courseFormError}
                </p>
              ) : null}
              <div>
                <label htmlFor="course-title" className="block text-sm font-medium text-slate-700">
                  Tên khóa học <span className="text-rose-600">*</span>
                </label>
                <input
                  id="course-title"
                  required
                  maxLength={255}
                  value={courseForm.title}
                  onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label
                  htmlFor="course-tagline"
                  className="block text-sm font-medium text-slate-700"
                >
                  Mô tả ngắn
                </label>
                <input
                  id="course-tagline"
                  maxLength={500}
                  value={courseForm.tagline ?? ""}
                  onChange={(event) =>
                    setCourseForm({ ...courseForm, tagline: event.target.value })
                  }
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <p className="block text-sm font-medium text-slate-700">
                  Mô tả khóa học <span className="text-rose-600">*</span>
                </p>
                <RichTextEditor
                  label="Mô tả khóa học"
                  value={courseForm.description}
                  compact
                  onChange={(description) =>
                    setCourseForm((current) => ({ ...current, description }))
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="course-price"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Giá bán (đồng)
                  </label>
                  <input
                    id="course-price"
                    type="number"
                    min="0"
                    step="1000"
                    value={courseForm.price}
                    onChange={(event) =>
                      setCourseForm({ ...courseForm, price: Number(event.target.value) })
                    }
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="course-original-price"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Giá gốc (tùy chọn)
                  </label>
                  <input
                    id="course-original-price"
                    type="number"
                    min="0"
                    step="1000"
                    value={courseForm.originalPrice ?? ""}
                    onChange={(event) =>
                      setCourseForm({
                        ...courseForm,
                        originalPrice:
                          event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="course-level"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Trình độ
                  </label>
                  <select
                    id="course-level"
                    value={courseForm.level}
                    onChange={(event) =>
                      setCourseForm({
                        ...courseForm,
                        level: event.target.value as InstructorCourseLevel,
                      })
                    }
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {Object.entries(levelLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="course-language"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Ngôn ngữ
                  </label>
                  <select
                    id="course-language"
                    value={courseForm.language}
                    onChange={(event) =>
                      setCourseForm({ ...courseForm, language: event.target.value })
                    }
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">Tiếng Anh</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setCourseFormOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" loading={courseFormLoading}>
                  {editingCourse ? "Lưu thay đổi" : "Tạo bản nháp"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {archiveTarget ? (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-slate-950/40 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archive-course-title"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
          >
            <h2 id="archive-course-title" className="text-lg font-semibold text-heading">
              Lưu trữ khóa học?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              “{archiveTarget.title}” sẽ được gỡ khỏi danh sách khóa học đang xuất bản. Bạn vẫn có
              thể xem nội dung trong khu vực giảng viên.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={archiveLoading}
                onClick={() => setArchiveTarget(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={archiveLoading}
                onClick={() => void archiveCourse()}
              >
                Lưu trữ khóa học
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[102] flex items-center justify-center bg-slate-950/40 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-course-title"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
          >
            <h2 id="delete-course-title" className="text-lg font-semibold text-heading">
              Xóa bản nháp khóa học?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Bạn sắp xóa “{deleteTarget.title}”. Thao tác này không thể hoàn tác.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={deleteLoading}
                onClick={() => setDeleteTarget(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={deleteLoading}
                onClick={() => void deleteDraftCourse()}
              >
                Xóa bản nháp
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {publishTarget ? (
        <div className="fixed inset-0 z-[103] flex items-center justify-center bg-slate-950/40 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="publish-course-title"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
          >
            <h2 id="publish-course-title" className="text-lg font-semibold text-heading">
              Xuất bản khóa học?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              “{publishTarget.title}” sẽ hiển thị công khai để học viên tìm và đăng ký. Kiểm tra lại
              mô tả, giá và nội dung trước khi tiếp tục.
            </p>
            {publishError ? (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
              >
                {publishError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={publishLoading}
                onClick={() => setPublishTarget(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                loading={publishLoading}
                onClick={() => void requestPublishCourse()}
              >
                Xuất bản khóa học
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </InstructorWorkspaceShell>
  );
}
