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
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { ApiClientError } from "@/lib/api";
import {
  completeLearningLesson,
  fetchSavedLessons,
  fetchLearningLesson,
  saveLearningLesson,
  unsaveLearningLesson,
  type CourseProgress,
  type LessonContent,
} from "@/lib/learning-client";
import { useAuthSession } from "@/lib/auth-session";

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
  }, [courseId, getAccessToken, lessonId, router, sessionLoading, user]);

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
                    <p className="text-xs font-semibold text-primary">BÀI HỌC · NỘI DUNG VĂN BẢN</p>
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
              <div className="prose prose-slate max-w-none px-5 py-7 text-[15px] leading-8 text-[#43514b] md:px-8 md:py-9">
                <p className="whitespace-pre-wrap">
                  {lesson.content?.trim() || "Giảng viên đang cập nhật nội dung cho bài học này."}
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
                  Hoàn thành bài học để cập nhật tiến độ khóa học.
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
