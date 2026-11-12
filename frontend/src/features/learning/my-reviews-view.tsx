"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, MessageSquareQuote, Sparkles, Star } from "lucide-react";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";
import { fetchMyEnrollments, type Enrollment } from "@/lib/learning-client";
import { fetchMyCourseReview, saveCourseReview, type CourseReview } from "@/lib/review-client";

type CourseReviewItemState = {
  enrollment: Enrollment;
  review: CourseReview | null;
  rating: number;
  comment: string;
  saving: boolean;
  error: string;
  successMessage: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function MyReviewsView() {
  const { getAccessToken } = useAuthSession();
  const [items, setItems] = useState<CourseReviewItemState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

      let enrollments: Enrollment[] = [];
      try {
        const page = await fetchMyEnrollments(token);
        enrollments = page.data.filter((item) => item.courseStatus === "PUBLISHED");
      } catch (reason) {
        if (reason instanceof ApiClientError && reason.code === "STUDENT_REQUIRED") {
          setItems([]);
          return;
        }
        throw reason;
      }

      const reviewResults = await Promise.all(
        enrollments.map(async (enrollment) => {
          try {
            const review = await fetchMyCourseReview(token, enrollment.courseId);
            return { enrollment, review, fetchError: "" };
          } catch (reason) {
            if (
              reason instanceof ApiClientError &&
              (reason.status === 404 || reason.code === "REVIEW_NOT_FOUND")
            ) {
              return { enrollment, review: null, fetchError: "" };
            }
            return {
              enrollment,
              review: null,
              fetchError:
                reason instanceof ApiClientError
                  ? reason.message
                  : "Không thể kiểm tra đánh giá hiện tại.",
            };
          }
        }),
      );

      setItems(
        reviewResults.map(({ enrollment, review, fetchError }) => ({
          enrollment,
          review,
          rating: review?.rating ?? 5,
          comment: review?.comment ?? "",
          saving: false,
          error: fetchError,
          successMessage: "",
        })),
      );
    } catch (reason) {
      setError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không thể tải danh sách đánh giá khóa học.",
      );
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  function updateItem(courseId: string, patch: Partial<CourseReviewItemState>) {
    setItems((current) =>
      current.map((item) => (item.enrollment.courseId === courseId ? { ...item, ...patch } : item)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>, item: CourseReviewItemState) {
    event.preventDefault();
    const courseId = item.enrollment.courseId;
    const trimmed = item.comment.trim();
    if (item.rating < 1 || item.rating > 5) {
      updateItem(courseId, { error: "Vui lòng chọn số sao từ 1 đến 5.", successMessage: "" });
      return;
    }
    if (!trimmed) {
      updateItem(courseId, { error: "Vui lòng nhập nhận xét của bạn.", successMessage: "" });
      return;
    }

    updateItem(courseId, { saving: true, error: "", successMessage: "" });
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const saved = await saveCourseReview(token, courseId, item.rating, trimmed);
      updateItem(courseId, {
        saving: false,
        review: saved,
        rating: saved.rating,
        comment: saved.comment,
        successMessage: item.review
          ? "Đã cập nhật đánh giá của bạn."
          : "Đã gửi đánh giá thành công.",
      });
    } catch (reason) {
      updateItem(courseId, {
        saving: false,
        error:
          reason instanceof ApiClientError
            ? reason.message
            : reason instanceof Error
              ? reason.message
              : "Không thể lưu đánh giá lúc này.",
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Đang tải đánh giá" aria-busy="true">
        {[0, 1].map((item) => (
          <div key={item} className="skeleton h-52 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-rose-800">{error}</p>
        <button
          type="button"
          onClick={() => void loadReviews()}
          className="focus-ring mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Thử tải lại
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-xs">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-primary">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-heading">Chưa có khóa học để đánh giá</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Sau khi ghi danh và học các khóa học trên EduAlto, bạn có thể gửi đánh giá để chia sẻ trải
          nghiệm với cộng đồng học viên.
        </p>
        <Link
          href="/courses"
          className="focus-ring mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Khám phá khóa học
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <h2 className="text-base font-bold text-heading">Đánh giá khóa học của bạn</h2>
        <p className="mt-0.5 text-xs text-muted">
          Chia sẻ cảm nhận về chất lượng bài giảng và xem phản hồi từ giảng viên.
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const courseId = item.enrollment.courseId;
          return (
            <article
              key={courseId}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <Link
                    href={`/learning/courses/${encodeURIComponent(courseId)}`}
                    className="text-base font-bold text-heading hover:text-primary"
                  >
                    {item.enrollment.courseTitle}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    Ghi danh ngày {formatDate(item.enrollment.enrolledAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    item.review ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {item.review ? `Đã đánh giá ${item.review.rating}/5 sao` : "Chưa có đánh giá"}
                </span>
              </div>

              {item.review?.instructorReply ? (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <MessageSquareQuote className="h-4 w-4 text-primary" aria-hidden="true" />
                    Phản hồi từ giảng viên
                  </p>
                  <p className="mt-1 text-sm leading-6 text-emerald-950">
                    {item.review.instructorReply}
                  </p>
                </div>
              ) : null}

              <form onSubmit={(event) => void handleSubmit(event, item)} className="mt-4 space-y-3">
                <div>
                  <span className="block text-xs font-semibold text-heading">Mức độ hài lòng</span>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Chọn ${star} sao cho ${item.enrollment.courseTitle}`}
                        aria-pressed={item.rating === star}
                        onClick={() => updateItem(courseId, { rating: star })}
                        className="focus-ring rounded-md p-1 transition hover:scale-110"
                      >
                        <Star
                          className={cn(
                            "h-6 w-6",
                            star <= item.rating
                              ? "fill-[#F5C34D] text-[#F5C34D]"
                              : "text-slate-300",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`review-comment-${courseId}`}
                    className="block text-xs font-semibold text-heading"
                  >
                    Nhận xét của bạn
                  </label>
                  <textarea
                    id={`review-comment-${courseId}`}
                    rows={3}
                    maxLength={2000}
                    value={item.comment}
                    onChange={(event) => updateItem(courseId, { comment: event.target.value })}
                    placeholder="Chia sẻ trải nghiệm học tập của bạn về khóa học này..."
                    className="focus-ring mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </div>

                {item.error ? (
                  <p role="alert" className="text-xs font-medium text-rose-600">
                    {item.error}
                  </p>
                ) : null}
                {item.successMessage ? (
                  <p
                    role="status"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {item.successMessage}
                  </p>
                ) : null}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={item.saving}
                    className="focus-ring inline-flex h-9.5 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
                  >
                    {item.saving ? "Đang lưu…" : item.review ? "Cập nhật đánh giá" : "Gửi đánh giá"}
                  </button>
                </div>
              </form>
            </article>
          );
        })}
      </div>
    </div>
  );
}
