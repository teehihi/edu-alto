"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EnsureQueryClient } from "@/lib/query-provider";
import { BookOpen, CircleAlert, MoreHorizontal, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";
import { useAuth } from "@/features/auth/auth-client";
import { ApiClientError } from "@/lib/api";
import {
  fetchInstructorCourses,
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
    <article className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-[0_0_8px_rgba(59,130,246,0.12)] sm:p-4">
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
              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
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
  const { accessToken, loading: authLoading } = useAuth();
  const [optionsOpen, setOptionsOpen] = useState(false);

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
      <div className="mx-auto w-full max-w-[1135px] px-4 py-5 sm:px-6 lg:px-7 lg:py-[21px]">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-primary">Danh sách khóa học</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/instructor"
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
            >
              Thêm khóa học
            </Link>
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
              <Link
                href="/instructor"
                className="focus-ring mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
              >
                Tạo khóa học
              </Link>
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
    </InstructorWorkspaceShell>
  );
}
