"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import {
  fetchCourseReviewSummary,
  fetchCourseReviews,
  saveCourseReview,
  type CourseReview,
  type CourseReviewSummary,
} from "@/lib/review-client";

export function CourseReviewSection({ courseId }: { courseId: string }) {
  const { user, getAccessToken } = useAuthSession();
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [summary, setSummary] = useState<CourseReviewSummary | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const [page, aggregate] = await Promise.all([
        fetchCourseReviews(courseId),
        fetchCourseReviewSummary(courseId),
      ]);
      setReviews(page.data);
      setSummary(aggregate);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể tải đánh giá lúc này.",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const [page, aggregate] = await Promise.all([
          fetchCourseReviews(courseId),
          fetchCourseReviewSummary(courseId),
        ]);
        if (active) {
          setReviews(page.data);
          setSummary(aggregate);
          setError("");
        }
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof ApiClientError ? reason.message : "Không thể tải đánh giá lúc này.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [courseId]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim()) {
      setError("Hãy chia sẻ trải nghiệm của bạn về khóa học.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await saveCourseReview(token, courseId, rating, comment.trim());
      setMessage("Đánh giá đã được gửi. Cảm ơn bạn đã chia sẻ!");
      await loadReviews();
    } catch (reason) {
      setError(
        reason instanceof ApiClientError
          ? reason.message
          : "Chỉ học viên đã ghi danh mới có thể đánh giá khóa học.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-5">
      {summary && (
        <p className="text-sm text-muted">
          {summary.reviewCount
            ? `${summary.averageRating.toFixed(1)} / 5 · ${summary.reviewCount} đánh giá`
            : "Chưa có đánh giá được công bố cho khóa học này."}
        </p>
      )}
      {user && (
        <form onSubmit={submitReview} className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold">Chia sẻ đánh giá của bạn</h3>
          <div className="mt-3 flex items-center gap-1" role="group" aria-label="Chọn số sao">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-label={`${value} sao`}
                aria-pressed={rating === value}
                className="focus-ring rounded p-1 text-amber-400"
              >
                <Star className="h-5 w-5" fill={value <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <label className="mt-3 block text-xs font-medium text-[#47534e]">
            Nhận xét
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={2000}
              rows={3}
              className="focus-ring mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-sm"
              placeholder="Điều bạn thích hoặc muốn chia sẻ về khóa học"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="focus-ring mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Đang gửi…" : "Gửi đánh giá"}
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="text-sm text-primary">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-muted">Đang tải đánh giá…</p>
      ) : reviews.length ? (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{review.studentName}</p>
                <span className="text-sm text-amber-500">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                {review.comment}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        !summary?.reviewCount && (
          <p className="rounded-lg border border-slate-200 p-6 text-sm text-muted">
            Chưa có đánh giá được công bố cho khóa học này.
          </p>
        )
      )}
    </div>
  );
}
