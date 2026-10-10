import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import type { CourseListItem } from "@/types/course";

const levelLabels: Record<CourseListItem["level"], string> = {
  ALL_LEVELS: "Mọi trình độ",
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

function formatPrice(amount: number): string {
  if (amount === 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("₫", "đ");
}

function formatLanguage(language: string): string {
  const normalizedLanguage = language.toLowerCase();
  if (normalizedLanguage.startsWith("vi")) return "Tiếng Việt";
  if (normalizedLanguage.startsWith("en")) return "Tiếng Anh";
  return language.toLocaleUpperCase("vi");
}

export function CourseCard({ course }: { course: CourseListItem }) {
  const courseUrl = `/courses/${encodeURIComponent(course.slug)}`;
  const hasDiscount = course.originalPrice !== null && course.originalPrice > course.price;
  const instructorName = course.instructor?.fullName ?? "Giảng viên EduAlto";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cardHover">
      <Link
        href={courseUrl}
        aria-label={`Xem khóa học ${course.title}`}
        className="focus-ring relative block aspect-[16/10] w-full overflow-hidden bg-primary-soft"
      >
        {course.thumbnailUrl ? (
          // Public course thumbnails are served from the configured R2 host.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-primary/60">
            <BookOpen className="h-12 w-12" aria-hidden="true" />
            <span className="sr-only">Khóa học chưa có ảnh bìa</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex rounded-md bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-dark">
            {levelLabels[course.level]}
          </span>
          <span className="text-xs font-medium text-muted">{formatLanguage(course.language)}</span>
        </div>

        <Link
          href={courseUrl}
          className="focus-ring mt-3 flex items-start gap-3 rounded-sm text-ink"
        >
          <h3 className="line-clamp-2 min-h-14 flex-1 text-[19px] font-bold leading-7 transition-colors group-hover:text-primary">
            {course.title}
          </h3>
          <ArrowUpRight
            className="mt-1 h-5 w-5 shrink-0 text-ink transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
            aria-hidden="true"
          />
        </Link>

        {course.tagline ? (
          <p className="mt-3 line-clamp-3 min-h-[72px] text-sm leading-6 text-muted">
            {course.tagline}
          </p>
        ) : (
          <div className="mt-3 min-h-[72px]" aria-hidden="true" />
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            {course.instructor?.avatarUrl ? (
              // Avatars may be served from a user-configured object storage host.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.instructor.avatarUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {instructorName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{instructorName}</p>
              <p className="truncate text-xs text-muted">
                {course.instructor?.headline || "Giảng viên"}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="whitespace-nowrap text-xl font-bold tabular-nums text-ink">
              {formatPrice(course.price)}
            </p>
            {hasDiscount ? (
              <p className="text-xs tabular-nums text-slate-400 line-through">
                {formatPrice(course.originalPrice!)}
              </p>
            ) : null}
          </div>
        </div>

        <Link
          href={courseUrl}
          className="focus-ring mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary px-4 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white active:bg-primary-dark"
        >
          Xem chi tiết khóa học
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
