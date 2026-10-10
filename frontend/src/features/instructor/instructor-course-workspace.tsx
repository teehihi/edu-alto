"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, CircleAlert, MoreHorizontal, RefreshCw } from "lucide-react";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";
import { useAuth } from "@/features/auth/auth-client";
import { CourseCurriculumSkeleton, Skeleton } from "@/components/ui/skeleton";
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
  const queryClient = useQueryClient();
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

  const refreshInstructorListing = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["instructor", "courses"] });
    void queryClient.invalidateQueries({ queryKey: ["instructor", "metrics"] });
  }, [queryClient]);

  useEffect(() => {
    void refreshCourse();
  }, [refreshCourse]);

  useEffect(() => {
    window.addEventListener("popstate", refreshInstructorListing);
    return () => window.removeEventListener("popstate", refreshInstructorListing);
  }, [refreshInstructorListing]);

  return (
    <InstructorWorkspaceShell activeSection="courses">
      <div className="w-full px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
        {loading ? (
          <div role="status" aria-label="Đang tải khóa học" aria-busy="true">
            <header className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <Skeleton className="h-7 w-56 max-w-full rounded-lg sm:w-72" />
              </div>
              <Skeleton className="size-10 shrink-0 rounded-md" />
            </header>

            <nav
              aria-label="Đang tải các mục trong khóa học"
              className="mt-4 flex gap-1 overflow-hidden border-b border-slate-200"
            >
              {[
                ["overview", "w-20"],
                ["reviews", "w-16"],
                ["students", "w-20"],
                ["chapters", "w-14"],
                ["details", "w-16"],
                ["promotions", "w-20"],
              ].map(([tabId, width]) => (
                <div key={tabId} className="shrink-0 border-b-[3px] border-transparent px-3 py-3">
                  <Skeleton className={`h-4 ${width} rounded-md`} />
                </div>
              ))}
            </nav>

            <div className="mt-4">
              {activeTab === "chapters" ? (
                <CourseCurriculumSkeleton embedded />
              ) : (
                <div className="space-y-4" aria-hidden="true">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-48 rounded-md" />
                      <Skeleton className="h-4 w-72 max-w-full rounded-md" />
                    </div>
                    <Skeleton className="h-10 w-36 shrink-0 rounded-md" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Skeleton className="h-24 rounded-lg border border-slate-200 bg-white" />
                    <Skeleton className="h-24 rounded-lg border border-slate-200 bg-white" />
                    <Skeleton className="h-24 rounded-lg border border-slate-200 bg-white" />
                  </div>
                  <Skeleton className="h-56 w-full rounded-lg border border-slate-200 bg-white" />
                </div>
              )}
            </div>
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
                  onClick={refreshInstructorListing}
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
