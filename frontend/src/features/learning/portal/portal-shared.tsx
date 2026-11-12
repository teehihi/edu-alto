"use client";

import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FolderClosed,
  GraduationCap,
  Heart,
  MessageCircle,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import type { LearningPortalView } from "@/features/learning/learning-navigation";
import type { CourseProgress, Enrollment } from "@/lib/learning-client";
import { cn } from "@/lib/cn";

export type PortalView = LearningPortalView;

export const viewTitles: Record<PortalView, string> = {
  overview: "Tổng quan học tập",
  courses: "Khóa học của tôi",
  analytics: "Phân tích học tập",
  certificates: "Chứng chỉ của tôi",
  savedLessons: "Bài học đã lưu",
  assignments: "Bài tập",
  calendar: "Thời khóa biểu",
  discussion: "Thảo luận",
  resources: "Tài liệu đã lưu",
  notes: "Ghi chú",
  messages: "Tin nhắn",
  teachers: "Giảng viên của tôi",
  reviews: "Đánh giá của tôi",
  notifications: "Thông báo",
  favorites: "Khóa học yêu thích",
};

export function PortalLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải dữ liệu học tập"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <div className="skeleton h-44 rounded-xl" />
      <div className="skeleton h-44 rounded-xl" />
      <div className="skeleton h-44 rounded-xl" />
    </div>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-white p-8 text-center">
      <p className="font-semibold text-[#101a2c]">Chưa thể tải khu vực học tập</p>
      <p className="mt-2 text-sm text-[#667085]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
      >
        Thử lại
      </button>
    </div>
  );
}

export function SectionHeading({
  title,
  action,
  href,
}: {
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-tight text-heading">{title}</h2>
      {action && href && (
        <Link
          href={href}
          className="focus-ring inline-flex items-center gap-0.5 text-xs font-semibold text-primary transition hover:text-primary-dark"
        >
          <span>{action}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="sr-only">: {title}</span>
        </Link>
      )}
    </div>
  );
}

export function RecentCourse({
  course,
  progress,
  compact = false,
}: {
  course: Enrollment;
  progress?: CourseProgress;
  compact?: boolean;
}) {
  const archived = course.courseStatus !== "PUBLISHED";
  const percent = progress?.progressPercent ?? 0;
  return (
    <article
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-3.5 transition hover:border-emerald-200 hover:shadow-soft",
        compact && "flex items-center gap-3",
      )}
    >
      <div className={cn("flex items-center gap-3", compact && "min-w-0 flex-1")}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-primary">
          <GraduationCap className="h-5 w-5 stroke-[1.8]" />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/learning/courses/${course.courseId}`}
            className="focus-ring line-clamp-1 text-xs font-bold text-heading hover:text-primary transition"
          >
            {course.courseTitle}
          </Link>
          <p className="mt-0.5 text-[11px] text-muted">
            {archived
              ? "Khóa học đã lưu trữ"
              : progress
                ? `${progress.completedLessons}/${progress.totalLessons} bài đã học`
                : "Đang cập nhật tiến độ"}
          </p>
        </div>
        {compact && (
          <Link
            href={archived ? "/courses" : `/learning/courses/${course.courseId}`}
            className="focus-ring inline-flex h-8 shrink-0 items-center rounded-xl bg-emerald-50 px-3 text-xs font-semibold text-primary transition hover:bg-emerald-100 active:scale-[0.98]"
          >
            {archived ? "Khám phá" : "Tiếp tục"}
          </Link>
        )}
      </div>
      {!compact && (
        <>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
            <span>Tiến độ học</span>
            <span className="font-semibold text-primary tabular-nums">
              {archived ? "—" : `${percent}%`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${archived ? 0 : percent}%` }}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Link
              href={archived ? "/courses" : `/learning/courses/${course.courseId}`}
              className="focus-ring inline-flex h-8 items-center gap-1 rounded-xl bg-emerald-50 px-3 text-xs font-semibold text-primary transition hover:bg-emerald-100 active:scale-[0.98]"
            >
              <span>{archived ? "Khám phá lại" : "Tiếp tục học"}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      )}
    </article>
  );
}

export function UtilityFallbackView({
  view,
}: {
  view: Exclude<PortalView, "overview" | "courses" | "savedLessons" | "analytics">;
}) {
  const configs = {
    certificates: {
      icon: GraduationCap,
      title: "Chứng chỉ của bạn",
      copy: "Chứng chỉ hoàn thành khóa học sẽ được lưu tại đây sau khi bạn hoàn tất giáo trình.",
      action: "Xem khóa học",
      href: "/learning/courses",
    },
    assignments: {
      icon: ClipboardList,
      title: "Bài tập sẽ được đồng bộ tại đây",
      copy: "Bài tập và bài kiểm tra sẽ xuất hiện theo các khóa học bạn đang học.",
      action: "Xem khóa học",
      href: "/learning/courses",
    },
    calendar: {
      icon: CalendarDays,
      title: "Lịch học của bạn",
      copy: "Khi có buổi học hoặc hạn nộp mới, lịch học sẽ được cập nhật tại đây.",
      action: "Quay về tổng quan",
      href: "/learning",
    },
    discussion: {
      icon: MessageCircle,
      title: "Hỏi đáp & Thảo luận bài học",
      copy: "Tham gia đặt câu hỏi gắn liền với mốc thời gian của video bài giảng và nhận giải đáp từ giảng viên ngay trong bài học.",
      action: "Mở khóa học của bạn",
      href: "/learning/courses",
    },
    resources: {
      icon: FolderClosed,
      title: "Tài liệu đã lưu",
      copy: "Lưu tài liệu trong bài học để tìm lại nhanh tại đây.",
      action: "Mở khóa học",
      href: "/learning/courses",
    },
    notes: {
      icon: NotebookPen,
      title: "Ghi lại điều bạn muốn nhớ",
      copy: "Ghi chú theo bài học sẽ được nhóm gọn để bạn xem lại bất cứ lúc nào.",
      action: "Mở khóa học",
      href: "/learning/courses",
    },
    messages: {
      icon: MessageCircle,
      title: "Tin nhắn của bạn",
      copy: "Tin nhắn từ giảng viên và nhóm học sẽ được cập nhật tại đây.",
      action: "Tìm giảng viên",
      href: "/learning/teachers",
    },
    teachers: {
      icon: GraduationCap,
      title: "Giảng viên của tôi",
      copy: "Danh sách giảng viên sẽ gắn với các khóa học bạn đã ghi danh.",
      action: "Khám phá khóa học",
      href: "/courses",
    },
    reviews: {
      icon: Sparkles,
      title: "Đánh giá của bạn",
      copy: "Sau khi học, bạn có thể chia sẻ trải nghiệm để giúp học viên khác chọn đúng khóa học.",
      action: "Xem khóa học",
      href: "/learning/courses",
    },
    notifications: {
      icon: Bell,
      title: "Thông báo học tập",
      copy: "Thông báo khóa học và phản hồi đánh giá sẽ được cập nhật tại đây.",
      action: "Xem thông báo",
      href: "/learning/notifications",
    },
    favorites: {
      icon: Heart,
      title: "Khóa học yêu thích",
      copy: "Những khóa học bạn đã lưu để xem lại sau sẽ được hiển thị tại đây.",
      action: "Xem khóa học đã lưu",
      href: "/learning/favorites",
    },
  };
  const config = configs[view];
  const Icon = config.icon;
  return (
    <div className="portal-card grid min-h-[420px] place-items-center rounded-2xl border border-slate-200/80 bg-white px-5 py-12 shadow-xs">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-primary border border-emerald-100 shadow-xs">
          <Icon className="h-7 w-7 stroke-[1.8]" />
        </span>
        <h2 className="mt-5 text-lg font-bold text-heading">{config.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{config.copy}</p>
        <Link
          href={config.href}
          className="focus-ring mt-5 inline-flex h-9.5 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-xs shadow-primary/20 hover:bg-primary-dark transition active:scale-[0.98]"
        >
          <span>{config.action}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
