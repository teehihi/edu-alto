"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CertificateListView } from "@/features/learning/certificate-list-view";
import { AssignmentsView } from "@/features/learning/portal/portal-assignments";
import { CalendarView } from "@/features/learning/portal/portal-calendar";
import { MyCourses } from "@/features/learning/portal/portal-courses";
import { StudentDiscussionsView } from "@/features/learning/portal/portal-discussions";
import { StudentMessagesView } from "@/features/learning/portal/portal-messages";
import { NotesView } from "@/features/learning/portal/portal-notes";
import { Overview } from "@/features/learning/portal/portal-overview";
import { ResourcesView } from "@/features/learning/portal/portal-resources";
import { MyReviewsView } from "@/features/learning/portal/portal-reviews";
import {
  ErrorPanel,
  PortalLoading,
  UtilityFallbackView,
  type PortalView,
} from "@/features/learning/portal/portal-shared";
import { PortalShell } from "@/features/learning/portal/portal-shell";
import { MyTeachersView } from "@/features/learning/portal/portal-teachers";
import { SavedLessonsView } from "@/features/learning/saved-lessons-view";
import { StudentAnalyticsView } from "@/features/learning/student-analytics-view";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { fetchInstructorCourses } from "@/lib/instructor-course-client";
import {
  fetchBatchCourseProgress,
  fetchMyEnrollments,
  type CourseProgress,
} from "@/lib/learning-client";
import { EnsureQueryClient } from "@/lib/query-provider";

export function LearningPortal({ view }: { view: PortalView }) {
  return (
    <EnsureQueryClient>
      <LearningPortalContent view={view} />
    </EnsureQueryClient>
  );
}

function LearningPortalContent({ view }: { view: PortalView }) {
  const { user, isLoading, getAccessToken } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const isInstructor = Boolean(
    user?.roles?.some((r) => r === "INSTRUCTOR" || r === "ROLE_INSTRUCTOR"),
  );

  const isDataView = view === "overview" || view === "courses";
  const [instructorTab, setInstructorTab] = useState<"teaching" | "learning">("teaching");
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, pathname, router, user]);

  const enrollmentsQuery = useQuery({
    queryKey: ["learning", "enrollments", user?.id],
    enabled: !isLoading && Boolean(user) && isDataView,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      try {
        const page = await fetchMyEnrollments(token);
        return page.data ?? [];
      } catch (fetchErr) {
        if (
          isInstructor &&
          fetchErr instanceof ApiClientError &&
          (fetchErr.status === 403 || fetchErr.code === "STUDENT_REQUIRED")
        ) {
          return [];
        }
        throw fetchErr;
      }
    },
  });

  const progressSummaryQuery = useQuery({
    queryKey: ["learning", "progress-summary", user?.id],
    enabled: !isLoading && Boolean(user) && isDataView,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      try {
        return await fetchBatchCourseProgress(token);
      } catch (fetchErr) {
        if (
          isInstructor &&
          fetchErr instanceof ApiClientError &&
          (fetchErr.status === 403 || fetchErr.code === "STUDENT_REQUIRED")
        ) {
          return [];
        }
        throw fetchErr;
      }
    },
  });

  const instructorCoursesQuery = useQuery({
    queryKey: ["learning", "instructor-courses", user?.id],
    enabled: !isLoading && Boolean(user) && isInstructor && isDataView,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) return [];
      try {
        const instPage = await fetchInstructorCourses(token);
        return instPage.data ?? [];
      } catch {
        // Non-critical if instructor course fetch fails
        return [];
      }
    },
  });

  const enrollments = useMemo(() => enrollmentsQuery.data ?? [], [enrollmentsQuery.data]);
  const instructorCourses = instructorCoursesQuery.data ?? [];
  const progressByCourse = useMemo<Record<string, CourseProgress>>(() => {
    const entries = (progressSummaryQuery.data ?? []).map((item) => [item.courseId, item] as const);
    return Object.fromEntries(entries);
  }, [progressSummaryQuery.data]);

  const loading =
    isDataView &&
    (isLoading || !user || enrollmentsQuery.isLoading || progressSummaryQuery.isLoading);
  const queryError = enrollmentsQuery.error ?? progressSummaryQuery.error;
  const errorMessage =
    isDataView && queryError
      ? queryError instanceof ApiClientError
        ? queryError.message
        : "Chưa thể tải dữ liệu học tập. Vui lòng thử lại."
      : "";

  const visibleCourses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    return enrollments.filter(
      (item) => !query || item.courseTitle.toLocaleLowerCase("vi").includes(query),
    );
  }, [enrollments, search]);

  return (
    <PortalShell
      view={view}
      isInstructor={isInstructor}
      instructorCoursesCount={instructorCourses.length}
      enrollmentsCount={enrollments.length}
      search={search}
      onSearchChange={setSearch}
      mobileNavOpen={mobileNavOpen}
      onMobileNavOpenChange={setMobileNavOpen}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarCollapsedChange={setSidebarCollapsed}
    >
      {loading ? (
        <PortalLoading />
      ) : errorMessage ? (
        <ErrorPanel
          message={errorMessage}
          onRetry={() => {
            void enrollmentsQuery.refetch();
            void progressSummaryQuery.refetch();
          }}
        />
      ) : view === "overview" ? (
        <Overview
          userName={user?.fullName ?? "bạn"}
          enrollments={visibleCourses}
          progress={progressByCourse}
          isInstructor={isInstructor}
        />
      ) : view === "courses" ? (
        <MyCourses
          courses={visibleCourses}
          progress={progressByCourse}
          search={search}
          onSearch={setSearch}
          isInstructor={isInstructor}
          instructorCourses={instructorCourses}
          instructorCoursesLoading={instructorCoursesQuery.isLoading}
          instructorTab={instructorTab}
          onInstructorTabChange={setInstructorTab}
        />
      ) : view === "analytics" ? (
        <StudentAnalyticsView isInstructor={isInstructor} />
      ) : view === "savedLessons" ? (
        <SavedLessonsView />
      ) : view === "certificates" ? (
        <CertificateListView />
      ) : (
        <UtilityView view={view} />
      )}
    </PortalShell>
  );
}

function UtilityView({
  view,
}: {
  view: Exclude<PortalView, "overview" | "courses" | "savedLessons" | "analytics">;
}) {
  if (view === "calendar") return <CalendarView />;
  if (view === "notes") return <NotesView />;
  if (view === "assignments") return <AssignmentsView />;
  if (view === "messages") return <StudentMessagesView />;
  if (view === "resources") return <ResourcesView />;
  if (view === "certificates") return <CertificateListView />;
  if (view === "discussion") return <StudentDiscussionsView />;
  if (view === "teachers") return <MyTeachersView />;
  if (view === "reviews") return <MyReviewsView />;
  return <UtilityFallbackView view={view} />;
}
