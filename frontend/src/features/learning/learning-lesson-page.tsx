"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  CircleCheck,
  CirclePlay,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { ApiClientError } from "@/lib/api";
import {
  completeLearningLesson,
  fetchCourseProgress,
  fetchLearningCurriculum,
  fetchLearningLesson,
  fetchMyEnrollments,
  fetchSavedLessons,
  fetchLessonVideoAccess,
  saveLearningLesson,
  unsaveLearningLesson,
  type CourseProgress,
  type LearningCurriculum,
  type LessonContent,
} from "@/lib/learning-client";
import { useAuthSession } from "@/lib/auth-session";
import { LearningQuizContent } from "@/features/learning/learning-quiz-content";
import { LearningWorkspaceShell } from "@/features/learning/learning-workspace-shell";
import { cn } from "@/lib/cn";

export function LearningLessonPage({ lessonId }: { lessonId: string }) {
  const { user, isLoading: sessionLoading, getAccessToken } = useAuthSession();
  const userId = user?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [curriculum, setCurriculum] = useState<LearningCurriculum | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoExpiresAt, setVideoExpiresAt] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const videoPositionRef = useRef(0);
  const videoWasPlayingRef = useRef(false);
  const videoAutoRetryCountRef = useRef(0);

  const refreshVideoAccess = useCallback(async () => {
    setVideoLoading(true);
    setVideoError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const videoAccess = await fetchLessonVideoAccess(token, lessonId);
      setVideoUrl(videoAccess.videoUrl);
      setVideoExpiresAt(videoAccess.expiresAt);
      return true;
    } catch (reason) {
      setVideoError(
        reason instanceof ApiClientError && reason.status === 404
          ? "Video chưa được tải lên hoặc hiện không khả dụng."
          : reason instanceof ApiClientError && reason.status === 403
            ? "Bạn cần ghi danh khóa học này để xem video."
            : reason instanceof Error
              ? reason.message
              : "Chưa thể mở video. Vui lòng thử lại.",
      );
      return false;
    } finally {
      setVideoLoading(false);
    }
  }, [getAccessToken, lessonId]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!userId) {
      router.replace(
        `/login?next=${encodeURIComponent(`/learning/lessons/${lessonId}${courseId ? `?courseId=${courseId}` : ""}`)}`,
      );
      return;
    }
    let active = true;
    void getAccessToken()
      .then((token) => {
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return Promise.all([fetchLearningLesson(token, lessonId), fetchSavedLessons(token)]).then(
          async ([result, savedLessons]) => {
            if (!active) return;
            setLesson(result);
            setSaved(savedLessons.data.some((item) => item.lessonId === lessonId));
            if (result.lessonType === "VIDEO") void refreshVideoAccess();

            try {
              const [enrollmentsResult, progressResult] = await Promise.allSettled([
                fetchMyEnrollments(token),
                fetchCourseProgress(token, result.courseId),
              ]);
              if (active && progressResult.status === "fulfilled") {
                setProgress(progressResult.value);
              }
              if (enrollmentsResult.status === "rejected") return;
              const courseEnrollment = enrollmentsResult.value.data.find(
                (item) => item.courseId === result.courseId,
              );
              if (!courseEnrollment) return;

              const resultCurriculum = await fetchLearningCurriculum(
                token,
                courseEnrollment.courseSlug,
              );
              if (active) {
                setCurriculum(resultCurriculum);
                setExpandedSections(
                  Object.fromEntries(
                    resultCurriculum.sections.map((section, index) => [
                      section.id,
                      index === 0 || section.lessons.some((item) => item.id === lessonId),
                    ]),
                  ),
                );
              }
            } catch {
              // Keep the lesson usable if the optional course outline cannot be loaded.
            }
          },
        );
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof ApiClientError && reason.status === 403
              ? "Bạn cần ghi danh khóa học này để mở bài học."
              : reason instanceof ApiClientError && reason.status === 404
                ? "Không tìm thấy bài học hoặc khóa học đã được lưu trữ."
                : reason instanceof Error
                  ? reason.message
                  : "Chưa thể tải bài học. Vui lòng thử lại.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId, getAccessToken, lessonId, refreshVideoAccess, router, sessionLoading, userId]);

  useEffect(() => {
    if (!videoExpiresAt || !videoUrl) return;
    const millisecondsUntilRefresh = new Date(videoExpiresAt).getTime() - Date.now() - 30_000;
    const timeout = window.setTimeout(
      () => void refreshVideoAccess(),
      Math.max(millisecondsUntilRefresh, 1000),
    );
    return () => window.clearTimeout(timeout);
  }, [refreshVideoAccess, videoExpiresAt, videoUrl]);

  function handleVideoError() {
    if (!videoUrl || videoAutoRetryCountRef.current >= 1) {
      setVideoError("Video bị gián đoạn. Hãy thử làm mới liên kết để tiếp tục xem.");
      return;
    }
    videoAutoRetryCountRef.current += 1;
    void refreshVideoAccess();
  }

  function handleVideoMetadataLoaded(event: SyntheticEvent<HTMLVideoElement>) {
    const player = event.currentTarget;
    if (videoPositionRef.current > 0) player.currentTime = videoPositionRef.current;
    if (videoWasPlayingRef.current) void player.play().catch(() => undefined);
    videoAutoRetryCountRef.current = 0;
    setVideoError("");
  }

  async function markComplete() {
    setSaving(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const result = await completeLearningLesson(token, lessonId);
      setProgress(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa thể lưu tiến độ học tập.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSaved() {
    setBookmarkBusy(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      if (saved) await unsaveLearningLesson(token, lessonId);
      else await saveLearningLesson(token, lessonId);
      setSaved(!saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa thể cập nhật bài học đã lưu.");
    } finally {
      setBookmarkBusy(false);
    }
  }

  async function refreshProgressAfterQuiz() {
    const progressCourseId = courseId ?? lesson?.courseId;
    if (!progressCourseId) return;
    try {
      const token = await getAccessToken();
      if (token) setProgress(await fetchCourseProgress(token, progressCourseId));
    } catch {
      // The quiz result remains available even if the progress summary cannot refresh.
    }
  }

  const backCourseId = courseId ?? lesson?.courseId;
  const backHref = backCourseId ? `/learning/courses/${backCourseId}` : "/learning/courses";
  return (
    <LearningWorkspaceShell title="Bài học">
      <main className="w-full">
        <Link
          href={backHref}
          className="focus-ring inline-flex items-center gap-2 rounded text-sm font-medium text-[#6e7c76] hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay về giáo trình
        </Link>
        {loading ? (
          <div role="status" className="mt-6 space-y-4">
            <div className="skeleton h-20 rounded-xl" />
            <div className="skeleton h-96 rounded-2xl" />
          </div>
        ) : error && !lesson ? (
          <div
            role="alert"
            className="mx-auto mt-10 max-w-xl rounded-2xl border border-[#e4ece8] bg-white p-8 text-center"
          >
            <BookOpen className="mx-auto h-9 w-9 text-primary" />
            <h1 className="mt-4 text-lg font-semibold">Chưa thể mở bài học</h1>
            <p className="mt-2 text-sm text-[#74817b]">{error}</p>
            <Link
              href={backHref}
              className="focus-ring mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
            >
              Quay về giáo trình
            </Link>
          </div>
        ) : lesson ? (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_400px]">
            <article className="overflow-hidden rounded-2xl border border-[#e4ece8] bg-white">
              <header className="border-b border-[#edf1ef] bg-gradient-to-r from-[#e8faf4] to-white px-5 py-6 md:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      BÀI HỌC ·{" "}
                      {lesson.lessonType === "QUIZ"
                        ? "BÀI KIỂM TRA"
                        : lesson.lessonType === "VIDEO"
                          ? "VIDEO BÀI GIẢNG"
                          : "NỘI DUNG VĂN BẢN"}
                    </p>
                    <h1 className="mt-2 text-2xl font-bold md:text-3xl">{lesson.title}</h1>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSaved}
                    disabled={bookmarkBusy}
                    aria-pressed={saved}
                    className="focus-ring inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#dfe9e4] bg-white px-3 text-sm font-semibold text-[#52605a] transition hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-60"
                  >
                    {bookmarkBusy ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : saved ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{saved ? "Đã lưu" : "Lưu bài học"}</span>
                  </button>
                </div>
              </header>
              {lesson.lessonType === "QUIZ" ? (
                <LearningQuizContent
                  lessonId={lessonId}
                  getAccessToken={getAccessToken}
                  onPassed={() => void refreshProgressAfterQuiz()}
                />
              ) : lesson.lessonType === "VIDEO" ? (
                <>
                  <div className="bg-[#101a2c] p-3 sm:p-5">
                    {videoUrl ? (
                      <video
                        key={videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        src={videoUrl}
                        aria-label={`Video bài học: ${lesson.title}`}
                        onTimeUpdate={(event) => {
                          videoPositionRef.current = event.currentTarget.currentTime;
                        }}
                        onPlay={() => {
                          videoWasPlayingRef.current = true;
                        }}
                        onPause={() => {
                          videoWasPlayingRef.current = false;
                        }}
                        onLoadedMetadata={handleVideoMetadataLoaded}
                        onError={handleVideoError}
                        className="mx-auto aspect-video max-h-[72vh] w-full rounded-lg bg-black"
                      />
                    ) : (
                      <div className="grid aspect-video place-items-center rounded-lg bg-slate-900 px-5 text-center text-white">
                        <div>
                          <CirclePlay
                            className="mx-auto h-10 w-10 text-primary"
                            aria-hidden="true"
                          />
                          <p role="status" className="mt-3 text-sm">
                            {videoLoading ? "Đang tải video…" : "Video chưa sẵn sàng"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {videoUrl && !videoError ? (
                    <div className="flex flex-col gap-2 px-5 pt-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
                      <p className="text-xs text-[#84908b]">
                        Liên kết xem được tự làm mới khi cần.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          videoAutoRetryCountRef.current = 0;
                          void refreshVideoAccess();
                        }}
                        disabled={videoLoading}
                        className="focus-ring min-h-9 self-start rounded-lg px-3 text-xs font-semibold text-primary transition hover:bg-primary-soft disabled:opacity-60 sm:self-auto"
                      >
                        {videoLoading ? "Đang làm mới…" : "Làm mới liên kết"}
                      </button>
                    </div>
                  ) : null}
                  {videoError ? (
                    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
                      <p role="alert" className="text-sm text-rose-700">
                        {videoError}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          videoAutoRetryCountRef.current = 0;
                          void refreshVideoAccess();
                        }}
                        disabled={videoLoading}
                        className="focus-ring inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60"
                      >
                        {videoLoading ? "Đang thử lại…" : "Tải lại video"}
                      </button>
                    </div>
                  ) : null}
                  <div className="prose prose-slate max-w-none px-5 py-6 text-[15px] leading-8 text-[#43514b] md:px-8">
                    <p className="whitespace-pre-wrap">{lesson.content?.trim()}</p>
                  </div>
                  <footer className="flex flex-col gap-4 border-t border-[#edf1ef] px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
                    <span role="status" className="flex items-center gap-2 text-sm text-[#77837e]">
                      {progress?.completed
                        ? "Đã hoàn thành bài học"
                        : "Học xong, đánh dấu để lưu tiến độ của bạn."}
                    </span>
                    <button
                      type="button"
                      onClick={markComplete}
                      disabled={saving || progress?.completed}
                      className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#159e75] disabled:cursor-not-allowed disabled:bg-[#9bdcc5]"
                    >
                      {saving ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {saving
                        ? "Đang lưu…"
                        : progress?.completed
                          ? "Đã hoàn thành"
                          : "Đánh dấu hoàn thành"}
                    </button>
                  </footer>
                </>
              ) : (
                <>
                  <div className="prose prose-slate max-w-none px-5 py-7 text-[15px] leading-8 text-[#43514b] md:px-8 md:py-9">
                    <p className="whitespace-pre-wrap">
                      {lesson.content?.trim() ||
                        "Giảng viên đang cập nhật nội dung cho bài học này."}
                    </p>
                  </div>
                  <footer className="flex flex-col gap-4 border-t border-[#edf1ef] px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
                    <span role="status" className="flex items-center gap-2 text-sm text-[#77837e]">
                      {progress?.completed ? (
                        <>
                          <CircleCheck className="h-5 w-5 text-primary" />
                          Đã hoàn thành bài học
                        </>
                      ) : (
                        "Học xong, đánh dấu để lưu tiến độ của bạn."
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={markComplete}
                      disabled={saving || progress?.completed}
                      className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#159e75] disabled:cursor-not-allowed disabled:bg-[#9bdcc5]"
                    >
                      {saving ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {saving
                        ? "Đang lưu..."
                        : progress?.completed
                          ? "Đã hoàn thành"
                          : "Đánh dấu hoàn thành"}
                    </button>
                  </footer>
                </>
              )}
              {error && (
                <p role="alert" className="px-5 pb-4 text-sm text-rose-600 md:px-8">
                  {error}
                </p>
              )}
            </article>
            <aside className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
              <header className="border-b border-[#e8eeeb] bg-[#f8fafc] p-4">
                <h2 className="text-base font-semibold text-[#101a2c]">Giáo trình khóa học</h2>
                <p className="mt-1 text-xs text-[#84908b]">
                  {progress
                    ? `${progress.completedLessons}/${progress.totalLessons} bài học đã hoàn thành`
                    : "Theo dõi các bài học trong khóa học"}
                </p>
                {progress ? (
                  <div
                    role="progressbar"
                    aria-label="Tiến độ khóa học"
                    aria-valuenow={progress.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="mt-3 h-2 overflow-hidden rounded-full bg-[#e9f1ed]"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${progress.progressPercent}%` }}
                    />
                  </div>
                ) : null}
              </header>
              {curriculum?.sections.length ? (
                <div className="max-h-[calc(100vh-17rem)] overflow-y-auto">
                  {curriculum.sections.map((section, index) => {
                    const isOpen = expandedSections[section.id] ?? false;
                    return (
                      <section key={section.id} className="border-b border-[#e8eeeb] last:border-0">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSections((current) => ({
                              ...current,
                              [section.id]: !isOpen,
                            }))
                          }
                          aria-expanded={isOpen}
                          className="focus-ring flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#f8fbfa]"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            {isOpen ? (
                              <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-[#101a2c]">
                                {/^(chương\s+\d+\s*[:：-])/i.test(section.title)
                                  ? section.title
                                  : `Chương ${index + 1}: ${section.title}`}
                              </span>
                              <span className="mt-0.5 block text-[11px] text-[#84908b]">
                                {section.lessons.length} bài học
                              </span>
                            </span>
                          </span>
                        </button>
                        {isOpen ? (
                          <ul className="divide-y divide-[#e8eeeb]">
                            {section.lessons.map((item, lessonIndex) => {
                              const supported = ["TEXT", "VIDEO", "QUIZ"].includes(item.lessonType);
                              const selected = item.id === lessonId;
                              return (
                                <li key={item.id}>
                                  <Link
                                    href={
                                      supported && lesson?.courseId
                                        ? `/learning/lessons/${item.id}?courseId=${encodeURIComponent(lesson.courseId)}`
                                        : "#lesson-unavailable"
                                    }
                                    onClick={(event) => {
                                      if (!supported) event.preventDefault();
                                    }}
                                    aria-current={selected ? "page" : undefined}
                                    className={cn(
                                      "focus-ring flex min-h-[68px] items-center gap-2.5 px-4 py-3 transition",
                                      selected
                                        ? "bg-primary text-white"
                                        : supported
                                          ? "text-[#101a2c] hover:bg-[#f1fbf7]"
                                          : "cursor-default text-[#89948f]",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "grid h-6 w-6 shrink-0 place-items-center rounded-md",
                                        selected ? "text-white" : "bg-[#e8faf4] text-primary",
                                      )}
                                    >
                                      {selected ? (
                                        <Check className="h-4 w-4" />
                                      ) : (
                                        <CirclePlay className="h-4 w-4" />
                                      )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-xs font-medium leading-5">
                                        {lessonIndex + 1}. {item.title}
                                      </span>
                                      <span
                                        className={cn(
                                          "mt-0.5 block text-[10px]",
                                          selected ? "text-white/80" : "text-[#84908b]",
                                        )}
                                      >
                                        {item.lessonType === "QUIZ"
                                          ? "Bài kiểm tra"
                                          : item.lessonType === "VIDEO"
                                            ? "Video bài giảng"
                                            : "Bài học văn bản"}
                                      </span>
                                    </span>
                                    {item.durationSeconds ? (
                                      <span
                                        className={cn(
                                          "shrink-0 text-[10px]",
                                          selected ? "text-white/80" : "text-[#84908b]",
                                        )}
                                      >
                                        {Math.ceil(item.durationSeconds / 60)} phút
                                      </span>
                                    ) : null}
                                  </Link>
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
                <div className="p-4">
                  <p className="text-xs leading-5 text-[#84908b]">
                    Giáo trình chưa sẵn sàng để hiển thị.
                  </p>
                  <Link
                    href={backHref}
                    className="focus-ring mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#dfe9e4] px-3 text-xs font-semibold text-[#52605a] transition hover:border-primary hover:text-primary"
                  >
                    <BookOpen className="h-4 w-4" />
                    Xem toàn bộ giáo trình
                  </Link>
                </div>
              )}
            </aside>
          </div>
        ) : null}
      </main>
    </LearningWorkspaceShell>
  );
}
