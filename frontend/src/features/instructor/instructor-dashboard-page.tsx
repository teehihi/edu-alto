"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Archive,
  BookOpen,
  ChartNoAxesCombined,
  CircleAlert,
  CircleArrowUp,
  DollarSign,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Pencil,
  RefreshCw,
  Settings,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/features/auth/auth-client";
import { ApiClientError } from "@/lib/api";
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

function CourseCard({
  course,
  onEdit,
  onArchive,
  onDelete,
  onPublish,
}: {
  course: InstructorCourse;
  onEdit: (course: InstructorCourse) => void;
  onArchive: (course: InstructorCourse) => void;
  onDelete: (course: InstructorCourse) => void;
  onPublish: (course: InstructorCourse) => void;
}) {
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
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={`/instructor/courses/${encodeURIComponent(course.id)}/curriculum`}
            className="focus-ring col-span-2 flex min-h-10 items-center justify-center rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition hover:bg-primary-soft active:bg-[#d9fff3]"
          >
            Quản lý nội dung
          </Link>
          {course.status === "DRAFT" ? (
            <>
              <button
                type="button"
                onClick={() => onEdit(course)}
                className="focus-ring flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary active:bg-slate-50"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" /> Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => onPublish(course)}
                className="focus-ring flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-3 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
              >
                <CircleArrowUp className="h-4 w-4" aria-hidden="true" /> Xuất bản
              </button>
              <button
                type="button"
                onClick={() => onDelete(course)}
                className="focus-ring col-span-2 flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:border-rose-300 hover:text-rose-700 active:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Xóa bản nháp
              </button>
            </>
          ) : course.status !== "ARCHIVED" ? (
            <>
              <button
                type="button"
                onClick={() => onEdit(course)}
                className="focus-ring flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary active:bg-slate-50"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" /> Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => onArchive(course)}
                className="focus-ring flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:border-rose-300 hover:text-rose-700 active:bg-rose-50"
              >
                <Archive className="h-4 w-4" aria-hidden="true" /> Lưu trữ
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onEdit(course)}
                className="focus-ring flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary active:bg-slate-50"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" /> Chỉnh sửa
              </button>
              <span className="flex min-h-10 items-center justify-center rounded-lg bg-slate-50 px-3 text-xs text-slate-500">
                Khóa học đã lưu trữ
              </span>
            </>
          )}
        </div>
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
  thumbnailKey: null,
};

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
  const [publishError, setPublishError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    if (!title || !description) {
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
        await createInstructorCourse(payload, accessToken);
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
    if (!publishTarget.description?.trim()) {
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
          <Button type="button" variant="primary" onClick={openCreateCourse}>
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
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
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
      </main>

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
                <label
                  htmlFor="course-description"
                  className="block text-sm font-medium text-slate-700"
                >
                  Mô tả khóa học <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="course-description"
                  required
                  rows={5}
                  value={courseForm.description}
                  onChange={(event) =>
                    setCourseForm({ ...courseForm, description: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
    </div>
  );
}
