"use client";

import Link from "next/link";
import { BookmarkCheck, BookOpen, Clock3, LoaderCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "@/lib/auth-session";
import { fetchSavedLessons, unsaveLearningLesson, type SavedLesson } from "@/lib/learning-client";

export function SavedLessonsView() {
  const { getAccessToken } = useAuthSession();
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyLesson, setBusyLesson] = useState("");
  const [error, setError] = useState("");
  const [pageNumber, setPageNumber] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const page = await fetchSavedLessons(token, pageNumber);
      setLessons(page.data);
      setTotalPages(page.meta.totalPages);
      setTotalLessons(page.meta.totalElements);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa thể tải bài học đã lưu.");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, pageNumber]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLessons(), 0);
    return () => window.clearTimeout(timer);
  }, [loadLessons]);

  async function removeLesson(lessonId: string) {
    setBusyLesson(lessonId);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await unsaveLearningLesson(token, lessonId);
      if (lessons.length === 1 && pageNumber > 0) {
        setPageNumber((current) => current - 1);
      } else {
        await loadLessons();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa thể bỏ lưu bài học.");
    } finally {
      setBusyLesson("");
    }
  }

  if (loading) {
    return (
      <div role="status" className="grid gap-3 md:grid-cols-2">
        <div className="skeleton h-28 rounded-xl" />
        <div className="skeleton h-28 rounded-xl" />
      </div>
    );
  }

  return (
    <section aria-label="Bài học đã lưu">
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadLessons()}
            className="mt-2 font-semibold underline"
          >
            Thử lại
          </button>
        </div>
      )}
      {lessons.length ? (
        <>
          <p className="mb-3 text-sm text-[#78857f]">Đã lưu {totalLessons} bài học</p>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="rounded-xl border border-[#e4ece8] bg-white p-4">
                <p className="text-xs font-medium text-primary">{lesson.courseTitle}</p>
                <h2 className="mt-1 line-clamp-2 text-sm font-semibold text-[#101a2c]">
                  {lesson.lessonTitle}
                </h2>
                <p className="mt-1 text-xs text-[#78857f]">{lesson.sectionTitle}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Link
                    href={`/learning/lessons/${lesson.lessonId}?courseId=${encodeURIComponent(lesson.courseId)}`}
                    className="focus-ring inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-[#159e75]"
                  >
                    <BookOpen className="h-4 w-4" />
                    Mở bài học
                  </Link>
                  <span className="flex items-center gap-1 text-[11px] text-[#87928d]">
                    <Clock3 className="h-3.5 w-3.5" />
                    {lesson.durationSeconds
                      ? `${Math.ceil(lesson.durationSeconds / 60)} phút`
                      : "Bài học"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeLesson(lesson.lessonId)}
                    disabled={busyLesson === lesson.lessonId}
                    aria-label={`Bỏ lưu ${lesson.lessonTitle}`}
                    className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#78857f] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    {busyLesson === lesson.lessonId ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav
              aria-label="Phân trang bài học đã lưu"
              className="mt-5 flex items-center justify-center gap-4"
            >
              <button
                type="button"
                onClick={() => setPageNumber((current) => Math.max(0, current - 1))}
                disabled={pageNumber === 0 || loading}
                className="focus-ring rounded-lg border border-[#dceae4] px-3 py-2 text-sm font-medium text-[#26332e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Trước
              </button>
              <span className="text-sm text-[#78857f]">
                Trang {pageNumber + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPageNumber((current) => Math.min(totalPages - 1, current + 1))}
                disabled={pageNumber + 1 >= totalPages || loading}
                className="focus-ring rounded-lg border border-[#dceae4] px-3 py-2 text-sm font-medium text-[#26332e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-[#dceae4] bg-[#fbfefc] px-5 py-12 text-center">
          <BookmarkCheck className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 text-sm font-semibold text-[#26332e]">
            Chưa có bài học nào được lưu
          </h2>
          <p className="mt-1 text-sm text-[#7c8783]">
            Lưu bài học để quay lại nhanh khi bạn cần ôn tập.
          </p>
          <Link
            href="/learning/courses"
            className="focus-ring mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Xem khóa học của tôi
          </Link>
        </div>
      )}
    </section>
  );
}
