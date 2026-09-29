"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  ChartNoAxesCombined,
  CircleAlert,
  DollarSign,
  LayoutDashboard,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/features/auth/auth-client";
import { ApiClientError } from "@/lib/api";
import {
  fetchInstructorCourses,
  type InstructorCourse,
  type InstructorCourseStatus,
} from "@/lib/instructor-course-client";

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

const metrics = [
  { title: "Tổng hoa hồng từ khóa học", icon: ChartNoAxesCombined },
  { title: "Tổng hoa hồng đã nhận", icon: ChartNoAxesCombined },
  { title: "Hoa hồng đang chờ xử lý", icon: ChartNoAxesCombined },
];

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

function CourseCard({ course }: { course: InstructorCourse }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {course.thumbnailUrl ? (
        <div className="h-32 overflow-hidden bg-slate-100">
          {/* The course thumbnail is supplied by the API and can change independently. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="min-w-0 flex-1 text-sm font-semibold leading-5 text-primary">
            {course.title}
          </h2>
          <span
            className={`inline-flex shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusStyle[course.status]}`}
          >
            {statusCopy[course.status]}
          </span>
        </div>
        {course.tagline ? (
          <p className="mt-2 line-clamp-2 text-xs text-muted">{course.tagline}</p>
        ) : null}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs text-muted">Giá khóa học</span>
          <span className="text-sm font-bold text-ink">{formatPrice(course.price)}</span>
        </div>
        <Link
          href={`/instructor/courses/${encodeURIComponent(course.id)}/curriculum`}
          className="focus-ring mt-4 flex min-h-10 items-center justify-center rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition hover:bg-primary-soft active:bg-[#d9fff3]"
        >
          Quản lý nội dung
        </Link>
      </div>
    </article>
  );
}

function UnavailableValue() {
  return (
    <span className="text-lg font-semibold text-ink" aria-label="Chưa có dữ liệu">
      —
    </span>
  );
}

export function InstructorDashboardPage() {
  const { accessToken, loading: authLoading, user } = useAuth();
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    if (authLoading) return;
    if (!accessToken) {
      setError("Vui lòng đăng nhập để xem khóa học của bạn.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInstructorCourses(accessToken);
      setCourses(result.data);
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể tải danh sách khóa học. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, authLoading]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCourses(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCourses]);

  const sidebarLinks = [
    { label: "Tổng quan", icon: LayoutDashboard, href: "/instructor", active: true },
    { label: "Khóa học", icon: BookOpen, href: "#courses-heading", active: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-ink lg:flex">
      <aside className="flex shrink-0 flex-col bg-[#101A2C] text-white lg:sticky lg:top-0 lg:h-screen lg:w-[261px]">
        <div className="flex h-[64px] items-center justify-between border-b border-white/10 px-5 lg:h-[68px]">
          <Link href="/" className="focus-ring rounded-sm" aria-label="EduAlto, về trang chủ">
            <Image
              src="/images/edualto-wordmark.png"
              alt="EduAlto"
              width={73}
              height={16}
              priority
            />
          </Link>
          <span className="text-xs font-medium text-slate-400">Giảng viên</span>
        </div>
        <nav
          aria-label="Điều hướng giảng viên"
          className="flex gap-1 overflow-x-auto p-2 lg:flex-1 lg:flex-col lg:gap-2 lg:p-3 lg:pt-5"
        >
          {sidebarLinks.map(({ label, icon: Icon, href, active }) => (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`focus-ring flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 text-sm transition ${
                active
                  ? "bg-white/5 font-semibold text-primary"
                  : "text-slate-200 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {label}
            </Link>
          ))}
          <span className="hidden px-3 pt-3 text-xs font-medium text-slate-500 lg:block">
            Sắp ra mắt
          </span>
          <div className="hidden lg:block">
            {[
              { label: "Cộng đồng", icon: MessageSquare },
              { label: "Doanh thu và Lợi nhuận", icon: DollarSign },
              { label: "Cài đặt", icon: Settings },
            ].map(({ label, icon: Icon }) => (
              <span
                key={label}
                aria-disabled="true"
                className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-slate-500"
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" /> {label}
              </span>
            ))}
          </div>
        </nav>
        <div className="hidden items-center gap-3 border-t border-white/10 px-5 py-4 lg:flex">
          <UserAvatar name={user?.fullName} avatarUrl={user?.avatarUrl} size="sm" />
          <span className="truncate text-sm text-slate-200">
            Chào, {user?.fullName || "Giảng viên"}
          </span>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-6 xl:pr-[38px] xl:pl-[61px]">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-primary">Tổng quan</h1>
          <Button
            type="button"
            disabled
            variant="primary"
            aria-label="Thêm khóa học (sắp ra mắt)"
            title="Tính năng tạo khóa học sẽ sớm ra mắt"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Thêm khóa học
          </Button>
        </header>

        <section
          aria-label="Doanh thu và hoa hồng"
          className="grid gap-4 xl:grid-cols-[minmax(280px,378px)_minmax(0,1fr)]"
        >
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {metrics.map(({ title, icon: Icon }) => (
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
                  <UnavailableValue />
                  <p className="mt-1 text-xs leading-5 text-slate-600">{title}</p>
                  <p className="text-[11px] text-muted">Chưa có dữ liệu</p>
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
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <ChartNoAxesCombined className="h-9 w-9 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Biểu đồ doanh số chưa có dữ liệu
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
                Thống kê sẽ hiển thị khi hệ thống có dữ liệu doanh thu cho khóa học của bạn.
              </p>
            </div>
          </section>
        </section>

        <section className="mt-8" aria-labelledby="rating-heading">
          <h2 id="rating-heading" className="mb-3 text-base font-semibold text-slate-900">
            Đánh giá
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {ratingBuckets.map((label, index) => (
              <article
                key={label}
                className="min-h-[76px] rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <p className="text-xs text-slate-600">{label}</p>
                <div className="mt-2 flex items-center gap-2">
                  <UnavailableValue />
                  {index > 0 ? (
                    <Star className="h-4 w-4 text-amber-400" aria-label={`${index} sao`} />
                  ) : null}
                </div>
                <p className="text-[10px] text-muted">Chưa có dữ liệu</p>
              </article>
            ))}
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
            <span className="text-xs text-muted">
              {loading ? "Đang tải…" : `${courses.length} khóa học`}
            </span>
          </div>

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
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
