"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, CircleAlert, MoreHorizontal, RefreshCw } from "lucide-react";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";
import { useAuth } from "@/features/auth/auth-client";
import { ApiClientError } from "@/lib/api";
import { fetchInstructorCourse, type InstructorCourse } from "@/lib/instructor-course-client";

export type InstructorCourseTab =
  | "overview"
  | "reviews"
  | "students"
  | "chapters"
  | "details"
  | "promotions";

type InstructorCourseWorkspaceContextValue = {
  accessToken: string | null;
  course: InstructorCourse;
  refreshCourse: () => Promise<void>;
  setCourse: (course: InstructorCourse) => void;
};

const tabs: Array<{ id: InstructorCourseTab; label: string }> = [
  { id: "overview", label: "Hoa hồng" },
  { id: "reviews", label: "Đánh giá" },
  { id: "students", label: "Học viên" },
  { id: "chapters", label: "Chương" },
  { id: "details", label: "Chi tiết" },
  { id: "promotions", label: "Khuyến mãi" },
];

const CourseWorkspaceContext = createContext<InstructorCourseWorkspaceContextValue | null>(null);

export function useInstructorCourseWorkspace() {
  const context = useContext(CourseWorkspaceContext);
  if (!context) {
    throw new Error("useInstructorCourseWorkspace phải nằm trong InstructorCourseWorkspace.");
  }
  return context;
}

export function InstructorCourseWorkspace({
  courseId,
  activeTab,
  children,
}: {
  courseId: string;
  activeTab: InstructorCourseTab;
  children: ReactNode;
}) {
  const { accessToken, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<InstructorCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCourse = useCallback(async () => {
    if (authLoading) return;
    if (!accessToken) {
      setError("Vui lòng đăng nhập để xem thông tin khóa học.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCourse(await fetchInstructorCourse(courseId, accessToken));
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể tải thông tin khóa học. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, authLoading, courseId]);

  useEffect(() => {
    void refreshCourse();
  }, [refreshCourse]);

  return (
    <InstructorWorkspaceShell activeSection="courses">
      <div className="mx-auto w-full max-w-[1135px] px-4 py-5 sm:px-6 lg:px-7 lg:py-[21px]">
        {loading ? (
          <div className="space-y-5" aria-label="Đang tải khóa học">
            <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-14 animate-pulse rounded border-b border-slate-200 bg-white/50" />
            <div className="h-36 animate-pulse rounded-lg bg-white" />
          </div>
        ) : error || !course ? (
          <div role="alert" className="rounded-lg border border-rose-200 bg-white p-6 text-center">
            <CircleAlert className="mx-auto h-6 w-6 text-rose-600" aria-hidden="true" />
            <p className="mt-3 text-sm text-rose-800">{error || "Không tìm thấy khóa học này."}</p>
            <button
              type="button"
              onClick={() => void refreshCourse()}
              className="focus-ring mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Thử lại
            </button>
          </div>
        ) : (
          <CourseWorkspaceContext.Provider
            value={{ accessToken, course, refreshCourse, setCourse }}
          >
            <header className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  href="/instructor/courses/overview"
                  aria-label="Quay lại danh sách khóa học"
                  className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-md text-primary transition hover:bg-emerald-50 active:bg-emerald-100"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Link>
                <h1 className="truncate text-xl font-semibold text-primary sm:text-2xl">
                  {course.title}
                </h1>
              </div>
              <button
                type="button"
                disabled
                aria-label="Tùy chọn khóa học"
                title="Chưa có tùy chọn khóa học"
                className="focus-ring inline-flex size-10 shrink-0 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <nav
              aria-label="Các mục trong khóa học"
              className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200"
            >
              {tabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={`/instructor/courses/${encodeURIComponent(courseId)}/${tab.id === "chapters" ? "chapters/overview" : tab.id}`}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  className={`focus-ring shrink-0 border-b-[3px] px-3 py-3 text-sm transition ${
                    activeTab === tab.id
                      ? "border-primary font-semibold text-primary"
                      : "border-transparent font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4">{children}</div>
          </CourseWorkspaceContext.Provider>
        )}
      </div>
    </InstructorWorkspaceShell>
  );
}
