"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { EnsureQueryClient } from "@/lib/query-provider";
import { BookOpen, CircleAlert, MoreHorizontal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";
import { useAuth } from "@/features/auth/auth-client";
import { ApiClientError } from "@/lib/api";
import { courseDescriptionToText } from "@/lib/course-description";
import {
  createInstructorCourse,
  fetchInstructorCourses,
  type InstructorCourseLevel,
  type InstructorCoursePayload,
  type InstructorCourse,
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

const courseLevelLabels: Record<InstructorCourseLevel, string> = {
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
}: {
  course: InstructorCourse;
  stats: InstructorCourseMetrics | null;
}) {
  return (
    <article className="group flex min-w-0 transform-gpu flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-[0_0_8px_rgba(59,130,246,0.12)] transition-all duration-300 ease-out motion-reduce:transition-none motion-safe:hover:-translate-y-1 motion-safe:hover:border-primary/30 motion-safe:hover:shadow-cardHover focus-within:border-primary/30 focus-within:shadow-cardHover sm:p-4">
      <Link
        href={`/instructor/courses/${encodeURIComponent(course.id)}/overview`}
        className="focus-ring group block rounded-lg"
        aria-label={`Mở quản lý nội dung khóa học ${course.title}`}
      >
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-slate-100">
          {course.thumbnailUrl ? (
            // The thumbnail is dynamic API data and may use a host outside next/image config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover transition duration-300 motion-reduce:transition-none motion-safe:group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <BookOpen className="h-10 w-10" aria-hidden="true" />
              <span className="sr-only">Khóa học chưa có ảnh bìa</span>
            </div>
          )}
          <span
            className={`absolute left-2 top-2 inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusStyle[course.status]}`}
          >
            {statusCopy[course.status]}
          </span>
        </div>
        <h2 className="mt-3 line-clamp-2 min-h-12 text-base font-semibold leading-6 text-primary group-hover:text-[#087f5b]">
          {course.title}
        </h2>
      </Link>

      <dl className="mt-3 grid grid-flow-col grid-cols-3 grid-rows-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-3">
        <div className="min-w-0">
          <dt className="text-xs text-slate-600">Giá khóa học</dt>
          <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
            {formatPrice(course.price)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-600">Chứng chỉ</dt>
          <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
            {stats ? stats.certificateCount.toLocaleString("vi-VN") : "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-600">Chương</dt>
          <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
            {stats ? stats.chapterCount.toLocaleString("vi-VN") : "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-600">Đánh giá</dt>
          <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
            {stats ? stats.publicReviewCount.toLocaleString("vi-VN") : "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-600">Đơn hàng</dt>
          <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
            {stats ? stats.paidOrderCount.toLocaleString("vi-VN") : "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-600">Thêm vào kệ</dt>
          <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
            {stats ? stats.wishlistCount.toLocaleString("vi-VN") : "—"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function InstructorCourseListPage() {
  return (
    <EnsureQueryClient>
      <InstructorCourseListContent />
    </EnsureQueryClient>
  );
}

function InstructorCourseListContent() {
  const router = useRouter();
  const { accessToken, loading: authLoading } = useAuth();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [courseForm, setCourseForm] = useState<InstructorCoursePayload>(emptyCourseForm);
  const [courseFormError, setCourseFormError] = useState<string | null>(null);
  const [courseFormLoading, setCourseFormLoading] = useState(false);

  const {
    data: courses = [],
    isLoading: coursesLoading,
    error: coursesError,
    refetch: refetchCourses,
  } = useQuery({
    queryKey: ["instructor", "courses", accessToken],
    queryFn: () => fetchInstructorCourses(accessToken!).then((r) => r.data),
    enabled: Boolean(accessToken && !authLoading),
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ["instructor", "metrics", accessToken],
    queryFn: () => fetchInstructorCourseMetrics(accessToken!),
    enabled: Boolean(accessToken && !authLoading && courses.length > 0),
  });

  const courseStats = useMemo(() => indexInstructorCourseMetrics(metrics), [metrics]);
  const loading = coursesLoading;
  const error = coursesError
    ? coursesError instanceof ApiClientError
      ? coursesError.message
      : "Không thể tải danh sách khóa học. Vui lòng thử lại."
    : !accessToken && !authLoading
      ? "Vui lòng đăng nhập để xem khóa học của bạn."
      : null;

  const loadCourses = () => void refetchCourses();

  const openCreateCourse = () => {
    setCourseForm(emptyCourseForm);
    setCourseFormError(null);
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
      const createdCourse = await createInstructorCourse(payload, accessToken);
      setCourseFormOpen(false);
      router.push(`/instructor/courses/${encodeURIComponent(createdCourse.id)}/details`);
    } catch (cause) {
      setCourseFormError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể tạo khóa học. Vui lòng thử lại.",
      );
    } finally {
      setCourseFormLoading(false);
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
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setOptionsOpen(false);
  }

  return (
    <InstructorWorkspaceShell activeSection="courses">
      <div className="w-full px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-primary">Danh sách khóa học</h1>
          <div className="flex items-center gap-2">
            <Button type="button" variant="primary" onClick={openCreateCourse}>
              Thêm khóa học
            </Button>
            <div className="relative">
              <button
                type="button"
                aria-label="Tùy chọn danh sách khóa học"
                aria-expanded={optionsOpen}
                aria-haspopup="menu"
                onClick={() => setOptionsOpen((open) => !open)}
                className="focus-ring inline-flex size-10 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-200 active:bg-slate-300"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
              {optionsOpen ? (
                <div
                  role="menu"
                  aria-label="Tùy chọn danh sách khóa học"
                  className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={loading}
                    onClick={() => {
                      setOptionsOpen(false);
                      void loadCourses();
                    }}
                    className="focus-ring flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Tải lại danh sách
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={loading || courses.length === 0}
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

        <section aria-labelledby="courses-heading">
          <h2 id="courses-heading" className="mb-3 text-xl font-semibold text-slate-900">
            Khóa học
          </h2>

          {loading ? (
            <div
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
              aria-label="Đang tải khóa học"
            >
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-white p-4">
                  <Skeleton className="aspect-[16/9] w-full rounded-lg" />
                  <Skeleton className="mt-4 h-5 w-4/5" />
                  <Skeleton className="mt-3 h-4 w-3/5" />
                  <Skeleton className="mt-6 h-10 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-white p-6 text-center"
            >
              <CircleAlert className="mx-auto h-6 w-6 text-rose-600" aria-hidden="true" />
              <p className="mt-3 text-sm text-rose-800">{error}</p>
              <button
                type="button"
                onClick={() => void loadCourses()}
                className="focus-ring mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Thử lại
              </button>
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <p className="mt-3 font-semibold text-slate-800">Bạn chưa có khóa học nào</p>
              <p className="mt-1 text-sm text-slate-600">
                Tạo khóa học đầu tiên để bắt đầu chia sẻ kiến thức.
              </p>
              <Button type="button" variant="primary" onClick={openCreateCourse}>
                Tạo khóa học
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  stats={courseStats[course.id] ?? null}
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
                Tạo khóa học mới
              </h2>
              <p className="mt-1 text-sm text-muted">
                Tạo bản nháp trước, sau đó bổ sung chương và bài học.
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
                  onChange={(event) =>
                    setCourseForm((current) => ({ ...current, title: event.target.value }))
                  }
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
                    setCourseForm((current) => ({ ...current, tagline: event.target.value }))
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
                      setCourseForm((current) => ({
                        ...current,
                        price: Number(event.target.value),
                      }))
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
                      setCourseForm((current) => ({
                        ...current,
                        originalPrice:
                          event.target.value === "" ? null : Number(event.target.value),
                      }))
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
                      setCourseForm((current) => ({
                        ...current,
                        level: event.target.value as InstructorCourseLevel,
                      }))
                    }
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {Object.entries(courseLevelLabels).map(([value, label]) => (
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
                      setCourseForm((current) => ({ ...current, language: event.target.value }))
                    }
                    className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">Tiếng Anh</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={courseFormLoading}
                  onClick={() => setCourseFormOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" loading={courseFormLoading}>
                  Tạo bản nháp
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </InstructorWorkspaceShell>
  );
}
