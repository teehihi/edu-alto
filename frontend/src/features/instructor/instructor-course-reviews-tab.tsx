"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, EyeOff, Eye, MessageSquareText, RefreshCw, Star } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ApiClientError } from "@/lib/api";
import {
  fetchCourseReviewSummary,
  type CourseReview,
  type CourseReviewSummary,
} from "@/lib/review-client";
import {
  fetchAllInstructorCourseReviews,
  setInstructorReviewVisibility,
} from "@/lib/instructor-community-client";
import { useInstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function InstructorCourseReviewsTab() {
  const { accessToken, course } = useInstructorCourseWorkspace();
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [summary, setSummary] = useState<CourseReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [page, nextSummary] = await Promise.all([
        fetchAllInstructorCourseReviews(course.id, accessToken ?? ""),
        fetchCourseReviewSummary(course.id),
      ]);
      setReviews(page);
      setSummary(nextSummary);
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể tải đánh giá khóa học. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, course.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadReviews(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadReviews]);

  const changeVisibility = async (review: CourseReview) => {
    if (!accessToken) return;
    setHidingId(review.id);
    setError(null);
    setNotice("");
    const publish = review.status === "HIDDEN";
    try {
      await setInstructorReviewVisibility(course.id, review.id, publish, accessToken);
      setReviews((current) =>
        current.map((item) =>
          item.id === review.id ? { ...item, status: publish ? "PUBLISHED" : "HIDDEN" } : item,
        ),
      );
      setSummary(await fetchCourseReviewSummary(course.id));
      setNotice(publish ? "Đã công khai lại đánh giá." : "Đã ẩn đánh giá khỏi trang khóa học.");
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể cập nhật đánh giá. Vui lòng thử lại.",
      );
    } finally {
      setHidingId(null);
    }
  };

  return (
    <section aria-labelledby="course-reviews-heading">
      <h2 id="course-reviews-heading" className="sr-only">
        Đánh giá khóa học
      </h2>
      {error ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-white p-4 text-sm text-rose-800"
        >
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="flex-1">{error}</div>
          <button
            type="button"
            onClick={() => void loadReviews()}
            className="focus-ring rounded px-2 py-1 font-semibold text-rose-800 hover:bg-rose-50"
          >
            Thử lại
          </button>
        </div>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {["Tổng đánh giá", "1 sao", "2 sao", "3 sao", "4 sao", "5 sao"].map((label, index) => {
          const value = loading
            ? "…"
            : index === 0
              ? (summary?.reviewCount ?? 0).toLocaleString("vi-VN")
              : (
                  summary?.ratingCounts?.find((item) => item.rating === index)?.count ?? 0
                ).toLocaleString("vi-VN");
          const badgeColors = [
            "",
            "bg-rose-500",
            "bg-amber-500",
            "bg-yellow-400",
            "bg-emerald-400",
            "bg-emerald-600",
          ];
          return (
            <article
              key={label}
              className="min-h-[76px] rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <p className="text-xs text-slate-600">{label}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xl font-semibold text-slate-900">{value}</span>
                {index > 0 ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${badgeColors[index]}`}
                  >
                    {index.toFixed(1)}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex min-h-32 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Đang tải đánh
            giá…
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <MessageSquareText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-3 font-semibold text-slate-800">Chưa có đánh giá công khai</p>
            <p className="mt-1 text-sm text-slate-600">
              Đánh giá của học viên sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_0_8px_rgba(59,130,246,0.08)] sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div
                    className="flex items-center gap-1"
                    aria-label={`${review.rating} trên 5 sao`}
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${index < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                        aria-hidden="true"
                      />
                    ))}
                    <span className="ml-1 text-xs text-slate-500">{review.rating}/5</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <UserAvatar name={review.studentName} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {review.studentName}
                      </p>
                      <time dateTime={review.createdAt} className="text-xs text-slate-500">
                        {formatDate(review.createdAt)}
                      </time>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void changeVisibility(review)}
                  disabled={hidingId === review.id}
                  className="focus-ring inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-primary active:bg-slate-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {review.status === "HIDDEN" ? (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  )}
                  {hidingId === review.id
                    ? "Đang cập nhật…"
                    : review.status === "HIDDEN"
                      ? "Công khai lại"
                      : "Ẩn đánh giá"}
                </button>
              </div>
              {review.status === "HIDDEN" ? (
                <p className="mt-3 w-fit rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  Đã ẩn khỏi trang khóa học
                </p>
              ) : null}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {review.comment}
              </p>
            </article>
          ))
        )}
      </div>
      <p className="sr-only">Đánh giá thuộc khóa học {course.title}</p>
    </section>
  );
}
