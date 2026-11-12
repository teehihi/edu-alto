"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Clock, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InstructorCourse } from "@/lib/instructor-course-client";
import type { CourseProgress, Enrollment } from "@/lib/learning-client";

export function InstructorCourseCard({ course }: { course: InstructorCourse }) {
  const [failedThumbnailUrl, setFailedThumbnailUrl] = useState<string | null>(null);
  const thumbnailUrl = course.thumbnailUrl;
  const isPublished = course.status === "PUBLISHED";
  const isDraft = course.status === "DRAFT";
  const statusLabel = isPublished ? "Đang xuất bản" : isDraft ? "Bản nháp" : "Đã lưu trữ";
  const statusBadgeClass = isPublished
    ? "border-emerald-400/30 bg-emerald-950/70 text-emerald-200"
    : isDraft
      ? "border-amber-400/30 bg-amber-950/70 text-amber-200"
      : "border-slate-400/30 bg-slate-900/70 text-slate-300";

  const levelLabel =
    course.level === "BEGINNER"
      ? "Cơ bản"
      : course.level === "INTERMEDIATE"
        ? "Trung cấp"
        : course.level === "ADVANCED"
          ? "Nâng cao"
          : "Tất cả cấp độ";

  const formattedPrice =
    course.price === 0
      ? "Miễn phí"
      : new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        })
          .format(course.price)
          .replace("₫", "đ");

  const formattedDate = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
    new Date(course.updatedAt),
  );

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/5">
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        {thumbnailUrl && failedThumbnailUrl !== thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={course.title}
            fill
            unoptimized
            onError={() => setFailedThumbnailUrl(thumbnailUrl)}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950">
            {/* Ambient glowing radial orbs */}
            <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />
            <div className="absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-teal-400/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />
            {/* Subtle dot pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:14px_14px]" />
            {/* Centered emblem */}
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-emerald-200 shadow-xl backdrop-blur-md transition-transform duration-300 group-hover:scale-110 group-hover:bg-white/15">
              <BookOpen className="h-7 w-7 stroke-[1.8]" />
            </div>
            {/* Bottom subtitle strip inside cover */}
            <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-[10px] font-semibold tracking-wider text-emerald-200/60 uppercase">
              <span>EduAlto Giảng viên</span>
              <span>{course.language.toUpperCase()}</span>
            </div>
          </div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-xs",
              statusBadgeClass,
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isPublished
                  ? "bg-emerald-400 animate-pulse"
                  : isDraft
                    ? "bg-amber-400"
                    : "bg-slate-400",
              )}
            />
            {statusLabel}
          </span>
        </div>

        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white shadow-xs backdrop-blur-md">
            {levelLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <h2 className="line-clamp-2 min-h-11 text-sm sm:text-base font-bold leading-snug text-heading transition-colors group-hover:text-primary">
            {course.title}
          </h2>
          {course.tagline ? (
            <p className="mt-1 line-clamp-1 text-xs text-muted leading-relaxed">{course.tagline}</p>
          ) : (
            <p className="mt-1 line-clamp-1 text-xs text-slate-400 italic">Chưa có mô tả ngắn</p>
          )}

          <div className="mt-3.5 flex items-center justify-between text-xs">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-[#079367] tabular-nums">
                {formattedPrice}
              </span>
              {course.originalPrice && course.originalPrice > course.price ? (
                <span className="text-xs text-slate-400 line-through">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                    maximumFractionDigits: 0,
                  })
                    .format(course.originalPrice)
                    .replace("₫", "đ")}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted">
              <Clock className="h-3 w-3 stroke-[1.8]" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3.5">
          <Link
            href={`/instructor/courses/${course.id}/overview`}
            className="focus-ring flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-white shadow-xs shadow-primary/20 transition hover:bg-primary-dark active:scale-[0.98]"
          >
            <span>Quản lý</span>
          </Link>
          <Link
            href={`/instructor/courses/${course.id}/curriculum`}
            className="focus-ring inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-heading active:scale-[0.98]"
            title="Quản lý giáo trình"
          >
            <BookOpen className="h-3.5 w-3.5 text-slate-500" />
            <span>Giáo trình</span>
          </Link>
          <Link
            href={`/courses/${course.slug}`}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-primary active:scale-[0.98]"
            title="Xem trang học viên"
            target="_blank"
            rel="noreferrer"
          >
            <ArrowUpRight className="h-4 w-4 stroke-[1.8]" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function CourseGridCard({
  course,
  progress,
  index,
}: {
  course: Enrollment;
  progress?: CourseProgress;
  index: number;
}) {
  const [failedThumbnailUrl, setFailedThumbnailUrl] = useState<string | null>(null);
  const thumbnailUrl = course.thumbnailUrl;
  const archived = course.courseStatus !== "PUBLISHED";
  const progressKnown = progress !== undefined;
  const hasStarted = (progress?.completedLessons ?? 0) > 0;
  const percent = progress?.progressPercent ?? 0;
  const tones = [
    "from-emerald-900 via-teal-950 to-slate-950",
    "from-teal-900 via-cyan-950 to-slate-950",
    "from-slate-900 via-emerald-950 to-slate-950",
  ];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/5">
      <div
        className={cn(
          "relative flex aspect-video w-full items-center justify-center overflow-hidden bg-gradient-to-br",
          tones[index % tones.length],
        )}
      >
        {thumbnailUrl && failedThumbnailUrl !== thumbnailUrl ? (
          <>
            <Image
              src={thumbnailUrl}
              alt={course.courseTitle}
              fill
              unoptimized
              onError={() => setFailedThumbnailUrl(thumbnailUrl)}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-slate-950/25" />
          </>
        ) : (
          <>
            {/* Ambient glowing radial orbs */}
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:14px_14px]" />

            {/* Central emblem */}
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-xl backdrop-blur-md transition-transform duration-300 group-hover:scale-110 group-hover:bg-white/15">
              <BookOpen className="h-7 w-7 stroke-[1.8] text-emerald-200" />
            </div>
          </>
        )}

        <div className="absolute left-3 top-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
              archived
                ? "bg-slate-100 text-slate-700"
                : hasStarted
                  ? "bg-primary text-white"
                  : "bg-emerald-50 text-emerald-800",
            )}
          >
            {archived
              ? "Đã lưu trữ"
              : progressKnown
                ? hasStarted
                  ? "Đang học"
                  : "Chưa bắt đầu"
                : "Đang cập nhật"}
          </span>
        </div>

        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs backdrop-blur-md tabular-nums">
            {percent}%
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <h2 className="line-clamp-2 min-h-11 text-sm sm:text-base font-bold leading-snug text-heading transition-colors group-hover:text-primary">
            {course.courseTitle}
          </h2>
          <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-1 text-[11px]">
              <CalendarDays className="h-3 w-3 stroke-[1.8]" />
              <span>
                Ghi danh: {new Intl.DateTimeFormat("vi-VN").format(new Date(course.enrolledAt))}
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 tabular-nums">
              {archived
                ? "Không khả dụng"
                : `${progress?.completedLessons ?? 0}/${progress?.totalLessons ?? 0} bài`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${archived ? 0 : percent}%` }}
              />
            </div>
          </div>
        </div>

        <Link
          href={archived ? "/courses" : `/learning/courses/${course.courseId}`}
          className="focus-ring mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-white shadow-xs shadow-primary/20 transition hover:bg-primary-dark active:scale-[0.98]"
        >
          {archived ? (
            <>
              <span>Tìm khóa học tương tự</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>
                {progressKnown ? (hasStarted ? "Tiếp tục học" : "Bắt đầu học") : "Vào học"}
              </span>
            </>
          )}
        </Link>
      </div>
    </article>
  );
}
