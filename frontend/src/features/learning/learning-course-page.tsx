"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BookmarkCheck,
  BookmarkPlus,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  FileText,
  GraduationCap,
  LoaderCircle,
  PanelRightClose,
  PanelRightOpen,
  PlayCircle,
  Star,
  Video,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { UserAvatar } from "@/components/ui/user-avatar";
import { LearningWorkspaceShell } from "@/features/learning/learning-workspace-shell";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import {
  completeLearningLesson,
  fetchCourseProgress,
  fetchLearningCurriculum,
  fetchLearningLesson,
  fetchLessonVideoAccess,
  fetchLessonResourceDownload,
  fetchMyEnrollments,
  fetchSavedLessonResources,
  saveLearningResource,
  triggerResourceDownload,
  type CourseProgress,
  type Enrollment,
  type LearningCurriculum,
  type LessonContent,
} from "@/lib/learning-client";
import {
  fetchCourseReviews,
  fetchCourseReviewSummary,
  fetchMyCourseReview,
  saveCourseReview,
} from "@/lib/review-client";
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

function mergePublishedOwnReview(reviews: CourseReview[], ownReview: CourseReview | null) {
  if (!ownReview) return reviews;
  if (ownReview.status !== "PUBLISHED") {
    return reviews.filter((review) => review.id !== ownReview.id);
  }
  if (reviews.some((review) => review.id === ownReview.id)) {
    return reviews.map((review) => (review.id === ownReview.id ? ownReview : review));
  }
  return [ownReview, ...reviews];
}

function ReviewCard({
  review,
  instructorName,
  instructorAvatarUrl,
}: {
  review: CourseReview;
  instructorName: string;
  instructorAvatarUrl?: string | null;
}) {
  return (
    <article className="flex items-start gap-4 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:p-5">
      <UserAvatar name={review.studentName} avatarUrl={review.studentAvatarUrl} size="sm" />
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
        {review.instructorReply ? (
          <div className="mt-4 flex items-start gap-2.5">
            <UserAvatar name={instructorName} avatarUrl={instructorAvatarUrl} size="xs" />
            <div className="min-w-0 flex-1 rounded-xl bg-[#f2f4f7] px-3.5 py-2.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-xs font-semibold text-[#101a2c]">{instructorName}</p>
                {review.instructorRepliedAt ? (
                  <time
                    dateTime={review.instructorRepliedAt}
                    className="text-[11px] text-[#84908b]"
                  >
                    {formatReviewDate(review.instructorRepliedAt)}
                  </time>
                ) : null}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#475569]">
                {review.instructorReply}
              </p>
            </div>
          </div>
        ) : null}
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
  const [myReview, setMyReview] = useState<CourseReview | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccessModalOpen, setReviewSuccessModalOpen] = useState(false);
  const [relatedCourses, setRelatedCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState("");
  const [activeLessonContent, setActiveLessonContent] = useState<LessonContent | null>(null);
  const [activeLessonVideoUrl, setActiveLessonVideoUrl] = useState<string | null>(null);
  const [activeLessonLoading, setActiveLessonLoading] = useState(false);
  const [activeLessonError, setActiveLessonError] = useState("");
  const [completingLessonId, setCompletingLessonId] = useState<string | null>(null);
  const [completionFeedback, setCompletionFeedback] = useState<{
    lessonId: string;
    message: string;
    isError: boolean;
  } | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [savingAttachmentId, setSavingAttachmentId] = useState<string | null>(null);
  const [savedAttachmentIds, setSavedAttachmentIds] = useState<Set<string>>(() => new Set());
  const [resourceFeedback, setResourceFeedback] = useState<{
    attachmentId: string;
    text: string;
    isError: boolean;
  } | null>(null);
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
    setMyReview(null);
    setReviewRating(5);
    setReviewComment("");
    setReviewError("");
    setReviewSuccessModalOpen(false);
    setRelatedCourses([]);
    setActiveLessonId("");
    setCompletingLessonId(null);
    setCompletionFeedback(null);
    setSavedAttachmentIds(new Set());
    setResourceFeedback(null);
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
        void fetchSavedLessonResources(token, 0, 100, courseId)
          .then(async (savedPage) => {
            const savedResources = [...savedPage.data];
            for (let pageNumber = 1; pageNumber < savedPage.meta.totalPages; pageNumber += 1) {
              const page = await fetchSavedLessonResources(token, pageNumber, 100, courseId);
              savedResources.push(...page.data);
            }
            if (active) {
              setSavedAttachmentIds(new Set(savedResources.map((item) => item.attachmentId)));
            }
          })
          .catch(() => {
            // Saving remains idempotent if the library status cannot be loaded.
          });
        setActiveLessonId(firstPlayableLesson?.id ?? "");
        setExpandedSections(
          Object.fromEntries(
            loadedCurriculum.sections.map((section, index) => [section.id, index === 0]),
          ),
        );
        const ownReviewRequest = user.roles.includes("STUDENT")
          ? fetchMyCourseReview(token, courseId)
          : Promise.resolve(null);
        void Promise.allSettled([
          fetchPublicCourseBySlug(match.courseSlug),
          fetchCourseReviews(courseId),
          fetchCourseReviewSummary(courseId),
          ownReviewRequest,
          fetchPublicCourses({ size: 5, sort: "newest" }),
        ] as const).then(
          ([courseResult, reviewsResult, summaryResult, ownReviewResult, relatedResult]) => {
            if (!active) return;
            if (courseResult.status === "fulfilled") setCourse(courseResult.value);
            if (reviewsResult.status === "fulfilled") {
              setReviews(
                mergePublishedOwnReview(
                  reviewsResult.value.data,
                  ownReviewResult.status === "fulfilled" ? ownReviewResult.value : null,
                ),
              );
            } else if (ownReviewResult.status === "fulfilled" && ownReviewResult.value) {
              setReviews(mergePublishedOwnReview([], ownReviewResult.value));
            }
            if (summaryResult.status === "fulfilled") setReviewSummary(summaryResult.value);
            if (ownReviewResult.status === "fulfilled" && ownReviewResult.value) {
              setMyReview(ownReviewResult.value);
              setReviewRating(ownReviewResult.value.rating);
              setReviewComment(ownReviewResult.value.comment);
            } else if (
              ownReviewResult.status === "rejected" &&
              (!(ownReviewResult.reason instanceof ApiClientError) ||
                ownReviewResult.reason.status !== 404)
            ) {
              setReviewError(
                ownReviewResult.reason instanceof Error
                  ? ownReviewResult.reason.message
                  : "Chưa thể tải đánh giá của bạn.",
              );
            }
            if (relatedResult.status === "fulfilled") {
              setRelatedCourses(
                relatedResult.value.filter((item) => item.id !== courseId).slice(0, 4),
              );
            }
          },
        );
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
    if (
      sessionLoading ||
      savingReview ||
      !user ||
      enrollment?.courseId !== courseId ||
      enrollment.status !== "ACTIVE"
    ) {
      return;
    }
    let active = true;
    let requestInFlight = false;

    const refreshReviews = async () => {
      if (!active || requestInFlight || document.visibilityState === "hidden") return;
      requestInFlight = true;
      try {
        const ownReviewRequest = user.roles.includes("STUDENT")
          ? getAccessToken().then((token) => {
              if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");
              return fetchMyCourseReview(token, courseId);
            })
          : Promise.resolve(null);
        const [reviewsResult, summaryResult, ownReviewResult] = await Promise.allSettled([
          fetchCourseReviews(courseId),
          fetchCourseReviewSummary(courseId),
          ownReviewRequest,
        ] as const);
        if (!active) return;
        if (summaryResult.status === "fulfilled") setReviewSummary(summaryResult.value);
        if (ownReviewResult.status === "fulfilled") setMyReview(ownReviewResult.value);
        setReviews((current) => {
          const nextReviews =
            reviewsResult.status === "fulfilled" ? reviewsResult.value.data : current;
          const ownReview =
            ownReviewResult.status === "fulfilled"
              ? ownReviewResult.value
              : (nextReviews.find((review) => review.studentId === user.id) ??
                current.find((review) => review.studentId === user.id) ??
                null);
          return mergePublishedOwnReview(nextReviews, ownReview);
        });
      } catch {
        // Keep the current review list visible when a background refresh fails.
      } finally {
        requestInFlight = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshReviews();
    };
    const intervalId = window.setInterval(() => void refreshReviews(), 12_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [courseId, enrollment, getAccessToken, savingReview, sessionLoading, user]);

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
    setDownloadingAttachmentId(attachmentId);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const access = await fetchLessonResourceDownload(
        token,
        currentLessonContent.id,
        attachmentId,
      );
      triggerResourceDownload(access.downloadUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa thể tải tài liệu bài học.");
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  async function saveLessonAttachment(attachmentId: string) {
    if (savedAttachmentIds.has(attachmentId)) return;
    setSavingAttachmentId(attachmentId);
    setResourceFeedback(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await saveLearningResource(token, attachmentId);
      setSavedAttachmentIds((current) => new Set(current).add(attachmentId));
      setResourceFeedback({ attachmentId, text: "Đã thêm vào thư viện", isError: false });
    } catch (error) {
      setResourceFeedback({
        attachmentId,
        text: error instanceof Error ? error.message : "Chưa thể lưu tài liệu vào thư viện.",
        isError: true,
      });
    } finally {
      setSavingAttachmentId(null);
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

  async function markLessonComplete(lessonId: string) {
    setCompletingLessonId(lessonId);
    setCompletionFeedback(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const updatedProgress = await completeLearningLesson(token, lessonId);
      setProgress((current) => ({
        ...updatedProgress,
        completedLessonIds: [
          ...new Set([
            ...(updatedProgress.completedLessonIds ?? current?.completedLessonIds ?? []),
            lessonId,
          ]),
        ],
      }));
      setCompletionFeedback({
        lessonId,
        message: "Đã đánh dấu bài học hoàn thành.",
        isError: false,
      });
    } catch (error) {
      setCompletionFeedback({
        lessonId,
        message:
          error instanceof ApiClientError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Chưa thể cập nhật tiến độ bài học. Vui lòng thử lại.",
        isError: true,
      });
    } finally {
      setCompletingLessonId(null);
    }
  }

  async function submitCourseReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewComment.trim()) {
      setReviewError("Hãy chia sẻ trải nghiệm của bạn về khóa học.");
      return;
    }

    setSavingReview(true);
    setReviewError("");
    setReviewSuccessModalOpen(false);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const savedReview = await saveCourseReview(
        token,
        courseId,
        reviewRating,
        reviewComment.trim(),
      );
      setMyReview(savedReview);
      setReviews((current) => [
        savedReview,
        ...current.filter((review) => review.id !== savedReview.id),
      ]);
      setReviewSuccessModalOpen(true);
      try {
        setReviewSummary(await fetchCourseReviewSummary(courseId));
      } catch {
        // Keep the saved review visible if the summary refresh fails.
      }
    } catch (error) {
      setReviewError(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Chưa thể gửi đánh giá. Vui lòng thử lại.",
      );
    } finally {
      setSavingReview(false);
    }
  }

  return (
    <LearningWorkspaceShell title={courseTitle}>
      <main className="-mx-4 -my-6 min-h-screen bg-[linear-gradient(180deg,#E6F7F2_0%,#F2FAF7_248px,#FFFFFF_608px,#FFFFFF_100%)] px-4 py-6 md:-mx-7 md:px-7 md:py-8">
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
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOutlineCollapsed((collapsed) => !collapsed)}
                  aria-label={
                    outlineCollapsed ? "Hiện giáo trình khóa học" : "Ẩn giáo trình khóa học"
                  }
                  aria-controls="course-outline"
                  aria-expanded={!outlineCollapsed}
                  className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dfe9e4] bg-white px-3 text-sm font-medium text-[#52647d] transition hover:border-primary hover:text-primary"
                >
                  {outlineCollapsed ? (
                    <PanelRightOpen aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <PanelRightClose aria-hidden="true" className="h-4 w-4" />
                  )}
                  {outlineCollapsed ? "Hiện giáo trình" : "Ẩn giáo trình"}
                </button>
              </div>
              <div
                className={cn(
                  "grid items-start gap-6 lg:gap-x-10 lg:gap-y-0",
                  outlineCollapsed
                    ? "lg:grid-cols-1"
                    : "lg:grid-cols-[minmax(0,2.1fr)_minmax(320px,1fr)]",
                )}
              >
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
                    <article className="overflow-clip rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
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
                    <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
                      {currentLessonContent.thumbnailUrl ? (
                        <div className="relative aspect-video max-h-[72vh] bg-[#101a2c]">
                          <Image
                            unoptimized
                            src={currentLessonContent.thumbnailUrl}
                            alt={`Ảnh minh họa bài học: ${currentLessonContent.title}`}
                            fill
                            sizes="(max-width: 1024px) 100vw, 66vw"
                            className="object-cover"
                          />
                        </div>
                      ) : null}
                      <header className="flex items-start gap-3 border-b border-[#e2e8f0] bg-[#f5fbf9] px-4 py-3.5 sm:px-5">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eaf7f3] text-primary">
                          <FileText aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                            Bài đọc
                          </p>
                          <h2 className="mt-1 text-lg font-semibold text-[#101a2c]">
                            {currentLessonContent.title}
                          </h2>
                        </div>
                      </header>
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
                  className={cn(
                    "scroll-mt-28 flex min-h-[560px] max-h-[811px] flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[811px] lg:min-h-[811px]",
                    outlineCollapsed && "hidden",
                  )}
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
                                  const completed = Boolean(
                                    progress?.completedLessonIds?.includes(lesson.id) ||
                                    progress?.completed,
                                  );
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
                                            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#20b486] text-white">
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
                                                  : "Bài đọc"}
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

                  {currentLessonContent?.lessonType === "TEXT" ? (
                    <section
                      aria-labelledby="lesson-content-title"
                      className="mt-6 border-t border-[#e2e8f0] pt-5"
                    >
                      <h2 id="lesson-content-title" className="text-lg font-semibold text-primary">
                        Nội dung bài đọc
                      </h2>
                      {currentLessonContent.content?.trim() ? (
                        <div
                          className="course-description-content mt-2 text-sm leading-7 text-[#334155] [&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeCourseDescription(currentLessonContent.content),
                          }}
                        />
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-[#64748b]">
                          {currentLessonContent.attachments.length
                            ? "Tài liệu đọc được đính kèm bên dưới."
                            : waitingForLessonContent
                              ? "Đang tải nội dung bài học…"
                              : "Giảng viên đang cập nhật nội dung cho bài học này."}
                        </p>
                      )}
                    </section>
                  ) : null}

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
                            <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
                              {resourceFeedback?.attachmentId === attachment.id ? (
                                <span
                                  role={resourceFeedback.isError ? "alert" : "status"}
                                  className={cn(
                                    "w-full text-right text-[11px] sm:w-auto",
                                    resourceFeedback.isError ? "text-rose-600" : "text-primary",
                                  )}
                                >
                                  {resourceFeedback.text}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void saveLessonAttachment(attachment.id)}
                                disabled={
                                  savingAttachmentId === attachment.id ||
                                  savedAttachmentIds.has(attachment.id)
                                }
                                aria-label={
                                  savedAttachmentIds.has(attachment.id)
                                    ? `Đã thêm ${attachment.fileName} vào thư viện`
                                    : `Thêm ${attachment.fileName} vào thư viện`
                                }
                                className="focus-ring inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#101a2c] px-3 text-xs font-semibold text-white transition hover:bg-[#202d42] active:bg-[#101a2c] disabled:cursor-default disabled:opacity-70"
                              >
                                {savedAttachmentIds.has(attachment.id) ? (
                                  <BookmarkCheck aria-hidden="true" className="h-4 w-4" />
                                ) : (
                                  <BookmarkPlus aria-hidden="true" className="h-4 w-4" />
                                )}
                                {savingAttachmentId === attachment.id
                                  ? "Đang lưu…"
                                  : savedAttachmentIds.has(attachment.id)
                                    ? "Đã lưu"
                                    : "Thêm vào thư viện"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void downloadLessonAttachment(attachment.id)}
                                disabled={downloadingAttachmentId === attachment.id}
                                className="focus-ring inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763] disabled:cursor-wait disabled:opacity-60"
                              >
                                <Download aria-hidden="true" className="h-4 w-4" />
                                {downloadingAttachmentId === attachment.id ? "Đang tải…" : "Tải về"}
                              </button>
                            </div>
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

                  {currentLessonContent &&
                  (currentLessonContent.lessonType === "TEXT" ||
                    currentLessonContent.lessonType === "VIDEO") ? (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] pt-5">
                      {completionFeedback?.lessonId === currentLessonContent.id &&
                      completionFeedback.isError ? (
                        <p role="alert" className="text-sm text-rose-700">
                          {completionFeedback.message}
                        </p>
                      ) : (
                        <span />
                      )}
                      {progress?.completedLessonIds?.includes(currentLessonContent.id) ||
                      progress?.completed ? (
                        <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#eaf7f3] px-4 text-sm font-semibold text-[#087a5b]">
                          <Check aria-hidden="true" className="h-4 w-4" />
                          Đã hoàn thành
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(completingLessonId)}
                          onClick={() => void markLessonComplete(currentLessonContent.id)}
                          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763] disabled:cursor-wait disabled:opacity-60"
                        >
                          {completingLessonId === currentLessonContent.id ? (
                            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check aria-hidden="true" className="h-4 w-4" />
                          )}
                          {completingLessonId === currentLessonContent.id
                            ? "Đang cập nhật…"
                            : "Đánh dấu hoàn thành"}
                        </button>
                      )}
                    </div>
                  ) : null}
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
                {user?.roles.includes("STUDENT") && enrollment?.status === "ACTIVE" ? (
                  <form
                    onSubmit={submitCourseReview}
                    className="mt-5 rounded-xl border border-[#d8e4df] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5"
                  >
                    <h3 className="text-sm font-semibold text-[#101a2c]">
                      {myReview ? "Cập nhật đánh giá của bạn" : "Chia sẻ trải nghiệm khóa học"}
                    </h3>
                    <p className="mt-1 text-xs text-[#64748b]">
                      Chỉ học viên đã ghi danh mới có thể gửi đánh giá.
                    </p>
                    <div
                      className="mt-3 flex items-center gap-1"
                      role="group"
                      aria-label="Chọn số sao"
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewRating(value)}
                          aria-label={`${value} sao`}
                          aria-pressed={reviewRating === value}
                          className="focus-ring rounded p-1 text-[#f5b400] transition hover:scale-110"
                        >
                          <Star
                            aria-hidden="true"
                            className="h-6 w-6"
                            fill={value <= reviewRating ? "currentColor" : "none"}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-medium text-[#475569]">
                        {reviewRating}/5
                      </span>
                    </div>
                    <label className="mt-3 block text-sm font-medium text-[#344054]">
                      Nhận xét
                      <textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        maxLength={2000}
                        rows={3}
                        className="focus-ring mt-1.5 w-full resize-y rounded-lg border border-[#d8e1ed] px-3 py-2.5 text-sm font-normal text-[#101a2c] placeholder:text-[#98a2b3]"
                        placeholder="Chia sẻ điều bạn thấy hữu ích hoặc có thể cải thiện"
                        required
                      />
                    </label>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-[#64748b]">
                        {reviewComment.length}/2000 ký tự
                      </span>
                      <button
                        type="submit"
                        disabled={savingReview || !reviewComment.trim()}
                        className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingReview
                          ? "Đang lưu…"
                          : myReview
                            ? "Cập nhật đánh giá"
                            : "Gửi đánh giá"}
                      </button>
                    </div>
                    {reviewError ? (
                      <p role="alert" className="mt-3 text-sm text-rose-700">
                        {reviewError}
                      </p>
                    ) : null}
                  </form>
                ) : null}
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
                      reviews.map((review) => (
                        <ReviewCard
                          key={review.id}
                          review={review}
                          instructorName={instructor?.fullName ?? "Giảng viên EduAlto"}
                          instructorAvatarUrl={instructor?.avatarUrl}
                        />
                      ))
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
      <FeedbackModal
        isOpen={reviewSuccessModalOpen}
        onClose={() => setReviewSuccessModalOpen(false)}
        title="Đánh giá đã được lưu"
        description="Cảm ơn bạn đã chia sẻ trải nghiệm về khóa học."
        tone="success"
        confirmText="Đóng"
      />
      <FeedbackModal
        isOpen={Boolean(completionFeedback && !completionFeedback.isError)}
        onClose={() => setCompletionFeedback(null)}
        title="Bài học đã hoàn thành"
        description={completionFeedback?.message}
        tone="success"
        confirmText="Đóng"
      />
    </LearningWorkspaceShell>
  );
}
