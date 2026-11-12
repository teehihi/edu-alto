"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  FolderClosed,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  CourseGridCard,
  InstructorCourseCard,
} from "@/features/learning/portal/portal-course-cards";
import { cn } from "@/lib/cn";
import type { InstructorCourse } from "@/lib/instructor-course-client";
import type { CourseProgress, Enrollment } from "@/lib/learning-client";

export function MyCourses({
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
