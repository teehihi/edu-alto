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
  LoaderCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { ApiClientError } from "@/lib/api";
import {
  completeLearningLesson,
  fetchSavedLessons,
  fetchLearningLesson,
  fetchCourseProgress,
  fetchLessonVideoAccess,
  saveLearningLesson,
  unsaveLearningLesson,
  type CourseProgress,
  type LessonContent,
} from "@/lib/learning-client";
import { useAuthSession } from "@/lib/auth-session";
import { LearningQuizContent } from "@/features/learning/learning-quiz-content";

export function LearningLessonPage({ lessonId }: { lessonId: string }) {
  const { user, isLoading: sessionLoading, getAccessToken } = useAuthSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
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
    if (!user) {
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
          ([result, savedLessons]) => {
            if (active) {
              setLesson(result);
              setSaved(savedLessons.data.some((item) => item.lessonId === lessonId));
              if (result.lessonType === "VIDEO") void refreshVideoAccess();
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
  }, [courseId, getAccessToken, lessonId, refreshVideoAccess, router, sessionLoading, user]);

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
    if (!courseId) return;
    try {
      const token = await getAccessToken();
      if (token) setProgress(await fetchCourseProgress(token, courseId));
    } catch {
      // The quiz result remains available even if the progress summary cannot refresh.
    }
  }

  const backHref = courseId ? `/learning/courses/${courseId}` : "/learning/courses";
  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#101a2c]">
      <AppHeader />
      <main className="container-page py-8 md:py-10">
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
              className="focus-ring mt-5 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              Quay về giáo trình
            </Link>
          </div>
        ) : lesson ? (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
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
            <aside className="rounded-2xl border border-[#e4ece8] bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7faf3] text-primary">
                <CirclePlay className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-sm font-semibold">Tiến độ học tập</h2>
              {progress ? (
                <>
                  <p className="mt-1 text-xs text-[#84908b]">
                    {progress.completedLessons}/{progress.totalLessons} bài học
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e9f1ed]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${progress.progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-right text-xs font-semibold text-primary">
                    {progress.progressPercent}%
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs leading-5 text-[#84908b]">
                  Hoàn thành bài học hoặc đạt điểm yêu cầu để cập nhật tiến độ khóa học.
                </p>
              )}
              <Link
                href={backHref}
                className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#dfe9e4] px-3 py-2.5 text-xs font-semibold text-[#52605a] hover:border-primary hover:text-primary"
              >
                <BookOpen className="h-4 w-4" />
                Xem toàn bộ giáo trình
              </Link>
            </aside>
          </div>
        ) : null}
      </main>
    </div>
  );
}
