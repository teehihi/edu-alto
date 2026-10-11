"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  FileText,
  GraduationCap,
  PlayCircle,
  Star,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { LearningWorkspaceShell } from "@/features/learning/learning-workspace-shell";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import {
  fetchCourseProgress,
  fetchLearningCurriculum,
  fetchLearningLesson,
  fetchLessonVideoAccess,
  fetchLessonResourceDownload,
  fetchMyEnrollments,
  type CourseProgress,
  type Enrollment,
  type LearningCurriculum,
  type LessonContent,
} from "@/lib/learning-client";
import { fetchCourseReviews, fetchCourseReviewSummary } from "@/lib/review-client";
import type { CourseReview, CourseReviewSummary } from "@/lib/review-client";
import { fetchPublicCourseBySlug, fetchPublicCourses } from "@/lib/course-client";
import type { CourseDetail, CourseListItem } from "@/types/course";
import { sanitizeCourseDescription } from "@/lib/course-description";
import { LearningQuizContent } from "@/features/learning/learning-quiz-content";
import { cn } from "@/lib/cn";

const courseTabs = [
  { id: "description", label: "Chi tiết" },
  { id: "instructor", label: "Người hướng dẫn" },
  { id: "course-outline", label: "Khóa học" },
  { id: "reviews", label: "Đánh giá" },
] as const;

const levelLabels: Record<string, string> = {
  ALL_LEVELS: "Mọi trình độ",
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "Tự học";
  return `${Math.ceil(seconds / 60)} phút`;
}

function formatPrice(price: number) {
  return price <= 0 ? "Miễn phí" : `${new Intl.NumberFormat("vi-VN").format(price)}đ`;
}

function formatAttachmentSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentTypeLabel(contentType: string) {
  if (contentType === "application/pdf") return "PDF";
  if (contentType.includes("wordprocessing") || contentType === "application/msword") return "Word";
  if (contentType.includes("presentation") || contentType === "application/vnd.ms-powerpoint")
    return "PowerPoint";
  if (contentType.includes("spreadsheet") || contentType === "application/vnd.ms-excel")
    return "Excel";
  return "Văn bản";
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function ReviewCard({ review }: { review: CourseReview }) {
  return (
    <article className="flex gap-4 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:p-5">
      <span
        aria-hidden="true"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf7f3] text-sm font-semibold text-primary"
      >
        {review.studentName.trim().charAt(0) || "H"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-semibold text-[#101a2c]">{review.studentName}</p>
          <span className="text-xs text-[#64748b]">{formatReviewDate(review.createdAt)}</span>
        </div>
        <div className="mt-1 flex items-center gap-1" aria-label={`${review.rating} trên 5 sao`}>
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              aria-hidden="true"
              className={cn(
                "h-3.5 w-3.5",
                index < review.rating ? "fill-[#f5b400] text-[#f5b400]" : "text-[#d0d5dd]",
              )}
            />
          ))}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#475569]">
          {review.comment}
        </p>
      </div>
    </article>
  );
}

function RelatedCourseCard({ course }: { course: CourseListItem }) {
  return (
    <Link
      href={`/courses/${encodeURIComponent(course.slug)}`}
      className="focus-ring group block min-w-[245px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.07)] transition hover:-translate-y-0.5 hover:shadow-md sm:min-w-0"
    >
      <div className="relative aspect-[1.75] overflow-hidden bg-[#eaf7f3]">
        {course.thumbnailUrl ? (
          <Image
            unoptimized
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            sizes="(min-width: 1024px) 25vw, 280px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-[#dff7ef] via-[#f5fbf9] to-[#c9eee2] text-primary">
            <BookOpen aria-hidden="true" className="h-9 w-9" />
          </div>
        )}
      </div>
      <div className="p-3.5">
        <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#101a2c]">
          {course.title}
        </p>
        <p className="mt-1 truncate text-xs text-[#64748b]">
          {course.instructor?.fullName ?? "Giảng viên EduAlto"}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-[#64748b]">
            <GraduationCap aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
            {levelLabels[course.level] ?? "Mọi trình độ"}
          </span>
          <strong className="text-sm text-[#101a2c]">{formatPrice(course.price)}</strong>
        </div>
      </div>
    </Link>
  );
}

export function LearningCoursePage({ courseId }: { courseId: string }) {
  const { user, isLoading: sessionLoading, getAccessToken } = useAuthSession();
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [curriculum, setCurriculum] = useState<LearningCurriculum | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<CourseReviewSummary | null>(null);
  const [relatedCourses, setRelatedCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [activeLessonId, setActiveLessonId] = useState("");
  const [activeLessonContent, setActiveLessonContent] = useState<LessonContent | null>(null);
  const [activeLessonVideoUrl, setActiveLessonVideoUrl] = useState<string | null>(null);
  const [activeLessonLoading, setActiveLessonLoading] = useState(false);
  const [activeLessonError, setActiveLessonError] = useState("");
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof courseTabs)[number]["id"]>("description");
  const instructor = course?.instructor ?? null;

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/learning/courses/${courseId}`)}`);
      return;
    }

    setLoading(true);
    setMessage("");
    setEnrollment(null);
    setCourse(null);
    setCurriculum(null);
    setProgress(null);
    setReviews([]);
    setReviewSummary(null);
    setRelatedCourses([]);
    setActiveLessonId("");
    let active = true;
    void getAccessToken()
      .then(async (token) => {
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        const page = await fetchMyEnrollments(token);
        const match = page.data.find((item) => item.courseId === courseId);
        if (!match) {
          throw new ApiClientError(403, {
            code: "ENROLLMENT_REQUIRED",
            message: "Bạn chưa ghi danh khóa học này.",
            details: [],
          });
        }
        if (match.courseStatus !== "PUBLISHED") throw new Error("Khóa học hiện đã được lưu trữ.");

        const [loadedCurriculum, loadedProgress] = await Promise.all([
          fetchLearningCurriculum(token, match.courseSlug),
          fetchCourseProgress(token, courseId),
        ]);
        if (!active) return;

        const lessons = loadedCurriculum.sections.flatMap((section) => section.lessons);
        const firstPlayableLesson = lessons.find((lesson) =>
          ["TEXT", "VIDEO", "QUIZ"].includes(lesson.lessonType),
        );

        setEnrollment(match);
        setCurriculum(loadedCurriculum);
        setProgress(loadedProgress);
        setActiveLessonId(firstPlayableLesson?.id ?? "");
        setExpandedSections(
          Object.fromEntries(
            loadedCurriculum.sections.map((section, index) => [section.id, index === 0]),
          ),
        );
        void Promise.allSettled([
          fetchPublicCourseBySlug(match.courseSlug),
          fetchCourseReviews(courseId),
          fetchCourseReviewSummary(courseId),
          fetchPublicCourses({ size: 5, sort: "newest" }),
        ] as const).then(([courseResult, reviewsResult, summaryResult, relatedResult]) => {
          if (!active) return;
          if (courseResult.status === "fulfilled") setCourse(courseResult.value);
          if (reviewsResult.status === "fulfilled") setReviews(reviewsResult.value.data);
          if (summaryResult.status === "fulfilled") setReviewSummary(summaryResult.value);
          if (relatedResult.status === "fulfilled") {
            setRelatedCourses(
              relatedResult.value.filter((item) => item.id !== courseId).slice(0, 4),
            );
          }
        });
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(
            error instanceof ApiClientError && error.status === 403
              ? "Bạn cần ghi danh khóa học trước khi vào lớp học."
              : error instanceof ApiClientError && error.status === 404
                ? "Không tìm thấy khóa học hoặc giáo trình đã được gỡ."
                : error instanceof Error
                  ? error.message
                  : "Chưa thể tải khóa học. Vui lòng thử lại.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courseId, getAccessToken, router, sessionLoading, user]);

  useEffect(() => {
    if (!activeLessonId) {
      setActiveLessonContent(null);
      setActiveLessonVideoUrl(null);
      setActiveLessonError("");
      setActiveLessonLoading(false);
      return;
    }

    let active = true;
    setActiveLessonContent(null);
    setActiveLessonVideoUrl(null);
    setActiveLessonError("");
    setActiveLessonLoading(true);

    void getAccessToken()
      .then(async (token) => {
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        const lesson = await fetchLearningLesson(token, activeLessonId);
        if (!active) return;

        setActiveLessonContent(lesson);
        if (lesson.lessonType !== "VIDEO") return;

        try {
          const videoAccess = await fetchLessonVideoAccess(token, activeLessonId);
          if (active) {
            if (videoAccess.videoUrl.trim()) setActiveLessonVideoUrl(videoAccess.videoUrl);
            else setActiveLessonError("Bài học này chưa có video được tải lên.");
          }
        } catch (reason) {
          if (!active) return;
          setActiveLessonError(
            reason instanceof ApiClientError && reason.status === 404
              ? "Bài học này chưa có video được tải lên."
              : reason instanceof ApiClientError && reason.status === 403
                ? "Bạn cần ghi danh khóa học này để xem video."
                : reason instanceof Error
                  ? reason.message
                  : "Chưa thể tải video bài học.",
          );
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setActiveLessonError(
            reason instanceof ApiClientError && reason.status === 404
              ? "Không tìm thấy nội dung bài học này."
              : reason instanceof ApiClientError && reason.status === 403
                ? "Bạn cần ghi danh khóa học này để mở bài học."
                : reason instanceof Error
                  ? reason.message
                  : "Chưa thể tải nội dung bài học.",
          );
        }
      })
      .finally(() => {
        if (active) setActiveLessonLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeLessonId, getAccessToken]);

  const allLessons = curriculum?.sections.flatMap((section) => section.lessons) ?? [];
  const activeLesson = allLessons.find(
    (lesson) =>
      lesson.id === activeLessonId && ["TEXT", "VIDEO", "QUIZ"].includes(lesson.lessonType),
  );
  const currentLessonContent =
    activeLessonContent?.id === activeLessonId ? activeLessonContent : null;
  const waitingForLessonContent =
    Boolean(activeLessonId) &&
    (activeLessonLoading || (!currentLessonContent && !activeLessonError));
  const courseTitle = course?.title ?? enrollment?.courseTitle ?? "Đang tải khóa học";
  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviewSummary?.ratingCounts?.find((item) => item.rating === rating)?.count ?? 0,
  }));
  const largestRatingCount = Math.max(1, ...ratingCounts.map((item) => item.count));

  function openTab(tabId: (typeof courseTabs)[number]["id"]) {
    setActiveTab(tabId);
    document.getElementById(tabId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function downloadLessonAttachment(attachmentId: string) {
    if (!currentLessonContent) return;
    const downloadWindow = window.open("about:blank", "lesson-resource-download");
    setDownloadingAttachmentId(attachmentId);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const access = await fetchLessonResourceDownload(
        token,
        currentLessonContent.id,
        attachmentId,
      );
      if (downloadWindow) downloadWindow.location.href = access.downloadUrl;
      else
        throw new Error(
          "Trình duyệt đang chặn cửa sổ tải tài liệu. Hãy cho phép cửa sổ bật lên rồi thử lại.",
        );
    } catch (error) {
      downloadWindow?.close();
      setMessage(error instanceof Error ? error.message : "Chưa thể tải tài liệu bài học.");
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  async function refreshProgressAfterQuiz() {
    try {
      const token = await getAccessToken();
      if (token) setProgress(await fetchCourseProgress(token, courseId));
    } catch {
      // Keep the quiz result visible if the progress summary cannot refresh.
    }
  }

  return (
    <LearningWorkspaceShell title={courseTitle}>
      <main className="-mx-4 -my-6 min-h-screen bg-gradient-to-b from-[#e1f8ef] via-[#f6fbf9] to-white px-4 py-6 md:-mx-7 md:px-7 md:py-8">
        <div className="mx-auto w-full max-w-none">
          {loading ? (
            <div role="status" aria-label="Đang tải khóa học" className="space-y-5">
              <div className="skeleton h-5 w-64 rounded" />
              <div className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(320px,1fr)]">
                <div className="skeleton aspect-[840/578] rounded-2xl" />
                <div className="skeleton min-h-[420px] rounded-2xl" />
              </div>
              <div className="skeleton h-48 rounded-2xl" />
            </div>
          ) : message ? (
            <div
              role="alert"
              className="mx-auto max-w-xl rounded-2xl border border-[#e2e8f0] bg-white p-8 text-center shadow-sm"
            >
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf7f3] text-primary">
                <BookOpen aria-hidden="true" className="h-7 w-7" />
              </span>
              <h1 className="mt-4 text-xl font-semibold text-[#101a2c]">Chưa thể mở khóa học</h1>
              <p className="mt-2 text-sm text-[#667085]">{message}</p>
              <Link
                href="/learning/courses"
                className="focus-ring mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
              >
                Quay về khóa học của tôi
              </Link>
            </div>
          ) : (
            <>
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(320px,1fr)] lg:gap-x-10 lg:gap-y-0">
                <section
                  aria-label="Bài học hiện tại"
                  className="min-w-0 lg:col-start-1 lg:row-start-1"
                >
                  {waitingForLessonContent ? (
                    <div role="status" aria-label="Đang tải nội dung bài học">
                      <div className="skeleton aspect-[840/578] rounded-2xl" />
                    </div>
                  ) : activeLessonError && !currentLessonContent ? (
                    <div
                      role="alert"
                      className="grid min-h-[360px] place-items-center rounded-2xl border border-[#e2e8f0] bg-white p-8 text-center shadow-sm"
                    >
                      <div>
                        <BookOpen aria-hidden="true" className="mx-auto h-9 w-9 text-primary" />
                        <p className="mt-3 text-sm font-semibold text-[#101a2c]">
                          Chưa thể tải nội dung bài học
                        </p>
                        <p className="mt-1 text-sm text-[#667085]">{activeLessonError}</p>
                      </div>
                    </div>
                  ) : currentLessonContent?.lessonType === "VIDEO" ? (
                    <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
                      {activeLessonVideoUrl && !activeLessonError ? (
                        <video
                          key={activeLessonVideoUrl}
                          controls
                          playsInline
                          preload="metadata"
                          src={activeLessonVideoUrl}
                          aria-label={`Video bài học: ${currentLessonContent.title}`}
                          className="aspect-video w-full bg-black"
                        />
                      ) : (
                        <div
                          role={activeLessonError ? "alert" : "status"}
                          className="border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-7 text-center sm:px-7"
                        >
                          <div>
                            <p className="text-sm text-[#667085]">
                              {activeLessonError || "Đang tải video bài học…"}
                            </p>
                          </div>
                        </div>
                      )}
                      <header className="border-t border-[#e2e8f0] px-4 py-3.5 sm:px-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Video bài giảng
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-[#101a2c]">
                          {currentLessonContent.title}
                        </h2>
                      </header>
                      {currentLessonContent.content?.trim() ? (
                        <div
                          className="course-description-content border-t border-[#e2e8f0] px-4 py-4 text-sm leading-6 text-[#334155] [&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg sm:px-5"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeCourseDescription(currentLessonContent.content),
                          }}
                        />
                      ) : null}
                    </article>
                  ) : currentLessonContent?.lessonType === "QUIZ" ? (
                    <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
                      <header className="border-b border-[#e2e8f0] bg-[#f5fbf9] px-4 py-3.5 sm:px-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Bài kiểm tra
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-[#101a2c]">
                          {currentLessonContent.title}
                        </h2>
                      </header>
                      <LearningQuizContent
                        lessonId={currentLessonContent.id}
                        getAccessToken={getAccessToken}
                        onPassed={() => void refreshProgressAfterQuiz()}
                      />
                    </article>
                  ) : currentLessonContent?.lessonType === "TEXT" ? (
                    <article className="min-h-[360px] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
                      <header className="flex items-start gap-3 border-b border-[#e2e8f0] bg-[#f5fbf9] px-4 py-3.5 sm:px-5">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eaf7f3] text-primary">
                          <FileText aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                            Bài học văn bản
                          </p>
                          <h2 className="mt-1 text-lg font-semibold text-[#101a2c]">
                            {currentLessonContent.title}
                          </h2>
                        </div>
                      </header>
                      {currentLessonContent.content?.trim() ? (
                        <div
                          className="course-description-content px-4 py-4 text-sm leading-7 text-[#334155] [&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg sm:px-5"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeCourseDescription(currentLessonContent.content),
                          }}
                        />
                      ) : (
                        <p className="px-4 py-4 text-sm leading-6 text-[#64748b] sm:px-5">
                          Giảng viên đang cập nhật nội dung cho bài học này.
                        </p>
                      )}
                    </article>
                  ) : activeLesson ? (
                    <div className="grid min-h-[360px] place-items-center rounded-2xl border border-[#e2e8f0] bg-white p-8 text-center shadow-sm">
                      <div>
                        <BookOpen aria-hidden="true" className="mx-auto h-9 w-9 text-primary" />
                        <p className="mt-3 text-sm font-semibold text-[#101a2c]">
                          Bài học này chưa được hỗ trợ
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-[#d8e4df] bg-white p-8 text-center">
                      <div>
                        <BookOpen aria-hidden="true" className="mx-auto h-9 w-9 text-primary" />
                        <p className="mt-3 text-sm font-semibold text-[#101a2c]">
                          Giáo trình đang được hoàn thiện
                        </p>
                        <p className="mt-1 text-sm text-[#667085]">
                          Chọn một bài học trong giáo trình để bắt đầu.
                        </p>
                      </div>
                    </div>
                  )}

                  <nav
                    aria-label="Nội dung khóa học"
                    className="mt-5 flex gap-2 overflow-x-auto border-b border-[#e2e8f0] pb-4"
                  >
                    {courseTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => openTab(tab.id)}
                        aria-current={activeTab === tab.id ? "location" : undefined}
                        className={cn(
                          "focus-ring shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition sm:px-5",
                          activeTab === tab.id
                            ? "bg-[#a7e7d4] text-[#0f604b]"
                            : "border border-[#e2e8f0] bg-white text-[#334155] hover:bg-[#f8fafc]",
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </section>

                <aside
                  id="course-outline"
                  aria-label="Giáo trình khóa học"
                  className="scroll-mt-28 flex min-h-[560px] max-h-[811px] flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[811px] lg:min-h-[811px]"
                >
                  <header className="shrink-0 border-b border-[#e2e8f0] px-4 py-5 sm:px-6">
                    <h2 className="text-lg font-semibold text-primary sm:text-xl">
                      Bài học đã hoàn thành
                    </h2>
                    <p className="mt-1 text-sm text-[#64748b]">
                      {progress?.completedLessons ?? 0} /{" "}
                      {progress?.totalLessons ?? allLessons.length} bài học
                    </p>
                    <div
                      role="progressbar"
                      aria-label="Tiến độ khóa học"
                      aria-valuenow={progress?.progressPercent ?? 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${progress?.progressPercent ?? 0}%` }}
                      />
                    </div>
                  </header>

                  {curriculum?.sections.length ? (
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      {curriculum.sections.map((section, sectionIndex) => {
                        const isOpen = expandedSections[section.id] ?? false;
                        return (
                          <section
                            key={section.id}
                            className="border-b border-[#e2e8f0] last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSections((current) => ({
                                  ...current,
                                  [section.id]: !isOpen,
                                }))
                              }
                              aria-expanded={isOpen}
                              aria-controls={`learning-section-${section.id}`}
                              className="focus-ring flex min-h-[68px] w-full items-center justify-between gap-3 bg-[#f8fafc] px-4 py-3 text-left transition hover:bg-[#f1f7f5] sm:px-5"
                            >
                              <span className="flex min-w-0 items-center gap-2.5">
                                {isOpen ? (
                                  <ChevronDown
                                    aria-hidden="true"
                                    className="h-4 w-4 shrink-0 text-[#475569]"
                                  />
                                ) : (
                                  <ChevronRight
                                    aria-hidden="true"
                                    className="h-4 w-4 shrink-0 text-[#475569]"
                                  />
                                )}
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-[#0f172a]">
                                    {/^(chương\s+\d+\s*[:：-])/i.test(section.title)
                                      ? section.title
                                      : `Chương ${sectionIndex + 1}: ${section.title}`}
                                  </span>
                                  <span className="mt-0.5 block text-xs text-[#64748b]">
                                    {section.lessons.length} bài học
                                  </span>
                                </span>
                              </span>
                            </button>
                            {isOpen ? (
                              <ul
                                id={`learning-section-${section.id}`}
                                className="divide-y divide-[#e2e8f0]"
                              >
                                {section.lessons.map((lesson, lessonIndex) => {
                                  const selected = lesson.id === activeLesson?.id;
                                  const completed = Boolean(progress?.completed);
                                  const supported = ["TEXT", "VIDEO", "QUIZ"].includes(
                                    lesson.lessonType,
                                  );
                                  return (
                                    <li key={lesson.id}>
                                      <button
                                        type="button"
                                        disabled={!supported}
                                        onClick={() => setActiveLessonId(lesson.id)}
                                        aria-pressed={selected}
                                        className={cn(
                                          "focus-ring flex min-h-[72px] w-full items-center gap-2.5 px-4 py-3 text-left transition sm:px-5",
                                          selected
                                            ? "bg-[#079367] text-white"
                                            : supported
                                              ? "bg-[#f8fafc] text-[#0f172a] hover:bg-white"
                                              : "cursor-not-allowed bg-[#f8fafc] text-[#94a3b8]",
                                        )}
                                      >
                                        <span className="shrink-0 text-sm tabular-nums">
                                          {completed ? (
                                            <span className="grid h-5 w-5 place-items-center rounded-sm bg-[#20b486] text-white">
                                              <Check aria-hidden="true" className="h-3.5 w-3.5" />
                                            </span>
                                          ) : selected ? (
                                            <Circle
                                              aria-hidden="true"
                                              className="h-5 w-5 text-white"
                                            />
                                          ) : (
                                            <Circle
                                              aria-hidden="true"
                                              className="h-5 w-5 text-[#94a3b8]"
                                            />
                                          )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="block text-sm leading-5">
                                            {lessonIndex + 1}. {lesson.title}
                                          </span>
                                          <span
                                            className={cn(
                                              "mt-1 block text-xs",
                                              selected ? "text-white/80" : "text-[#64748b]",
                                            )}
                                          >
                                            {!supported
                                              ? "Nội dung chưa được hỗ trợ"
                                              : lesson.lessonType === "VIDEO"
                                                ? "Bài học video"
                                                : lesson.lessonType === "QUIZ"
                                                  ? "Bài kiểm tra"
                                                  : "Bài học văn bản"}
                                          </span>
                                        </span>
                                        <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums">
                                          {lesson.lessonType === "VIDEO" ? (
                                            <Video aria-hidden="true" className="h-3.5 w-3.5" />
                                          ) : (
                                            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                                          )}
                                          {formatDuration(lesson.durationSeconds)}
                                        </span>
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </section>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid flex-1 place-items-center p-6 text-center">
                      <div>
                        <BookOpen aria-hidden="true" className="mx-auto h-8 w-8 text-primary" />
                        <p className="mt-3 text-sm font-semibold text-[#101a2c]">
                          Giáo trình đang được hoàn thiện
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#64748b]">
                          Bài học sẽ xuất hiện tại đây khi giảng viên cập nhật nội dung.
                        </p>
                      </div>
                    </div>
                  )}
                </aside>

                <section
                  id="description"
                  className="scroll-mt-28 border-b border-[#e2e8f0] py-6 lg:col-start-1 lg:row-start-2"
                >
                  <section aria-labelledby="lesson-overview-title" className="py-2">
                    <h2 id="lesson-overview-title" className="text-lg font-semibold text-primary">
                      Tổng quan bài học
                    </h2>
                    {currentLessonContent?.description?.trim() ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#334155]">
                        {currentLessonContent.description.trim()}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-[#64748b]">
                        {waitingForLessonContent
                          ? "Đang tải thông tin bài học…"
                          : activeLesson
                            ? "Giảng viên chưa cập nhật phần tổng quan cho bài học này."
                            : "Chọn một bài học để xem thông tin tổng quan."}
                      </p>
                    )}
                  </section>

                  <section
                    aria-labelledby="lesson-objectives-title"
                    className="mt-6 border-t border-[#e2e8f0] pt-5"
                  >
                    <h2 id="lesson-objectives-title" className="text-lg font-semibold text-primary">
                      Mục tiêu bài học
                    </h2>
                    {currentLessonContent?.objectives?.length ? (
                      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-[#334155]">
                        {currentLessonContent.objectives.map((objective, index) => (
                          <li key={`${index}-${objective}`}>{objective}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-[#64748b]">
                        {waitingForLessonContent
                          ? "Đang tải mục tiêu bài học…"
                          : "Giảng viên chưa cập nhật mục tiêu cho bài học này."}
                      </p>
                    )}
                  </section>

                  <section
                    aria-labelledby="lesson-attachments-title"
                    className="mt-6 border-t border-[#e2e8f0] pt-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2
                        id="lesson-attachments-title"
                        className="text-lg font-semibold text-primary"
                      >
                        Tài liệu bài học
                      </h2>
                      <span className="text-sm text-[#64748b]">
                        {currentLessonContent?.attachments.length ?? 0} tệp đính kèm
                      </span>
                    </div>
                    {currentLessonContent?.attachments.length ? (
                      <ul className="mt-4 space-y-2">
                        {currentLessonContent.attachments.map((attachment) => (
                          <li
                            key={attachment.id}
                            className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:flex-nowrap sm:px-4"
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "grid size-10 shrink-0 place-items-center rounded-[10px]",
                                attachment.contentType === "application/pdf"
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-blue-100 text-blue-600",
                              )}
                            >
                              <FileText className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-[#101a2c]">
                                {attachment.fileName}
                              </span>
                              <span className="mt-0.5 block text-xs text-[#64748b]">
                                {getAttachmentTypeLabel(attachment.contentType)} ·{" "}
                                {formatAttachmentSize(attachment.contentLength)}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => void downloadLessonAttachment(attachment.id)}
                              disabled={downloadingAttachmentId === attachment.id}
                              className="focus-ring inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763] disabled:cursor-wait disabled:opacity-60"
                            >
                              <Download aria-hidden="true" className="h-4 w-4" />
                              {downloadingAttachmentId === attachment.id ? "Đang tải…" : "Tải về"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 rounded-lg border border-dashed border-[#d8e4df] bg-white px-4 py-5 text-sm text-[#64748b]">
                        {waitingForLessonContent
                          ? "Đang tải tài liệu bài học…"
                          : "Bài học này chưa có tài liệu đính kèm."}
                      </p>
                    )}
                  </section>
                </section>
              </div>

              <section id="instructor" className="scroll-mt-28 border-b border-[#e2e8f0] py-10">
                <h2 className="text-lg font-semibold text-primary">Người hướng dẫn</h2>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-primary">
                    {instructor && (instructor.customHandle || instructor.id) ? (
                      <Link
                        href={`/profile/${encodeURIComponent(instructor.customHandle || instructor.id)}`}
                        className="focus-ring rounded hover:underline"
                      >
                        {instructor.fullName}
                      </Link>
                    ) : (
                      (instructor?.fullName ?? "Giảng viên EduAlto")
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-[#334155]">
                    {instructor?.headline ?? "Giảng viên của khóa học"}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-5 sm:gap-8">
                    <UserAvatar
                      name={instructor?.fullName ?? "Giảng viên EduAlto"}
                      avatarUrl={instructor?.avatarUrl ?? null}
                      size="2xl"
                      imageClassName="h-[88px] w-[88px] shrink-0 rounded-full object-cover ring-2 ring-primary/20 sm:h-[88px] sm:w-[88px]"
                    />
                    <div className="space-y-2 text-sm text-[#0f172a]">
                      <p className="flex items-center gap-2">
                        <Award aria-hidden="true" className="h-4 w-4 shrink-0" />
                        {reviewSummary?.reviewCount ?? 0} đánh giá khóa học
                      </p>
                      <p className="flex items-center gap-2">
                        <GraduationCap aria-hidden="true" className="h-4 w-4 shrink-0" />
                        {allLessons.length} bài học
                      </p>
                      <p className="flex items-center gap-2">
                        <PlayCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                        {curriculum?.sections.length ?? 0} chương học
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 max-w-4xl text-sm leading-6 text-[#475569]">
                    {course?.tagline ??
                      "Đồng hành cùng bạn trong lộ trình học tập và thực hành các nội dung của khóa học."}
                  </p>
                </div>
              </section>

              {relatedCourses.length ? (
                <section className="-mx-4 scroll-mt-28 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-9 md:-mx-7 md:px-7">
                  <div className="mx-auto max-w-none">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <h2 className="text-lg font-semibold text-[#101a2c]">
                        Khóa học khác của{" "}
                        <span className="text-primary">{instructor?.fullName ?? "giảng viên"}</span>
                      </h2>
                      <div className="hidden gap-2 sm:flex">
                        <button
                          type="button"
                          aria-label="Cuộn khóa học sang trái"
                          onClick={() =>
                            document.getElementById("related-courses")?.scrollBy({
                              left: -300,
                              behavior: "smooth",
                            })
                          }
                          className="focus-ring grid h-9 w-10 place-items-center rounded-lg bg-[#a7e7d4] text-primary transition hover:bg-[#84dbc2]"
                        >
                          <ChevronRight aria-hidden="true" className="h-4 w-4 rotate-180" />
                        </button>
                        <button
                          type="button"
                          aria-label="Cuộn khóa học sang phải"
                          onClick={() =>
                            document.getElementById("related-courses")?.scrollBy({
                              left: 300,
                              behavior: "smooth",
                            })
                          }
                          className="focus-ring grid h-9 w-10 place-items-center rounded-lg bg-[#a7e7d4] text-primary transition hover:bg-[#84dbc2]"
                        >
                          <ChevronRight aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div
                      id="related-courses"
                      className="grid gap-4 overflow-x-auto pb-2 sm:grid-cols-2 lg:grid-cols-4"
                    >
                      {relatedCourses.map((item) => (
                        <RelatedCourseCard key={item.id} course={item} />
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              <section id="reviews" className="scroll-mt-28 py-10">
                <h2 className="text-lg font-semibold text-primary">Đánh giá của học viên</h2>
                <div className="mt-5 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
                  <div>
                    <p className="text-xl font-semibold text-[#101a2c]">
                      <span className="text-[#f5b400]">★</span>{" "}
                      {reviewSummary?.reviewCount ? reviewSummary.averageRating.toFixed(1) : "—"}
                    </p>
                    <p className="mt-1 text-xs text-[#64748b]">
                      {reviewSummary?.reviewCount ?? 0} đánh giá
                    </p>
                    <div className="mt-3 space-y-2">
                      {ratingCounts.map(({ rating, count }) => (
                        <div
                          key={rating}
                          className="flex items-center gap-2 text-xs text-[#64748b]"
                        >
                          <span className="w-3 shrink-0">{rating}</span>
                          <Star
                            aria-hidden="true"
                            className="h-3 w-3 shrink-0 fill-[#f5b400] text-[#f5b400]"
                          />
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e2e8f0]">
                            <span
                              className="block h-full rounded-full bg-[#f5b400]"
                              style={{ width: `${(count / largestRatingCount) * 100}%` }}
                            />
                          </span>
                          <span className="w-5 shrink-0 text-right tabular-nums">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {reviews.length ? (
                      reviews.map((review) => <ReviewCard key={review.id} review={review} />)
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#d8e4df] bg-white px-5 py-8 text-center">
                        <Star aria-hidden="true" className="mx-auto h-6 w-6 text-[#f5b400]" />
                        <p className="mt-2 text-sm font-semibold text-[#101a2c]">
                          Chưa có đánh giá cho khóa học này
                        </p>
                        <p className="mt-1 text-xs text-[#64748b]">
                          Đánh giá sẽ xuất hiện tại đây sau khi được gửi.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </LearningWorkspaceShell>
  );
}
