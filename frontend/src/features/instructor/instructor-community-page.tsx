"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, Ellipsis, Pencil, Star, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/features/auth/auth-client";
import { ApiClientError } from "@/lib/api";
import { fetchInstructorCourses, type InstructorCourse } from "@/lib/instructor-course-client";
import {
  deleteInstructorReviewReply,
  fetchAllInstructorCourseReviews,
  saveInstructorReviewReply,
  setInstructorReviewVisibility,
} from "@/lib/instructor-community-client";
import type { CourseReview } from "@/lib/review-client";
import { ReviewStudentIdentity } from "@/features/instructor/review-student-identity";
import { InstructorMessagesPanel } from "@/features/instructor/instructor-messages-panel";
import { InstructorNotificationsPanel } from "@/features/instructor/instructor-notifications-panel";

type CommunityTab = "reviews" | "messages" | "notifications";
type ReviewWithCourse = CourseReview & { courseTitle: string };
type ReviewSort = "newest" | "oldest";
type ReviewVisibility = "all" | "PUBLISHED" | "HIDDEN";
type ReplyFilter = "all" | "replied" | "unreplied";

const reviewCourseConcurrency = 5;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function downloadCsv(reviews: ReviewWithCourse[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = [
    ["Khóa học", "Học viên", "Số sao", "Nội dung", "Ngày đánh giá"],
    ...reviews.map((review) => [
      review.courseTitle,
      review.studentName,
      String(review.rating),
      review.comment,
      formatDate(review.createdAt),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(quote).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "danh-gia-khoa-hoc.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function ReplyEditorActions({
  review,
  draft,
  saving,
  error,
  onCancel,
  onSave,
}: {
  review: ReviewWithCourse;
  draft: string;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      {error ? (
        <p role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      ) : (
        <span />
      )}
      <div className="ml-auto flex gap-2">
        {review.instructorReply ? (
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="focus-ring min-h-9 rounded-md px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Hủy
          </button>
        ) : null}
        <button
          type="button"
          disabled={saving || !draft.trim()}
          onClick={onSave}
          className="focus-ring min-h-9 rounded-md bg-primary px-3 text-xs font-semibold text-white hover:bg-[#159e75] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Đang lưu…" : review.instructorReply ? "Cập nhật phản hồi" : "Gửi phản hồi"}
        </button>
      </div>
    </div>
  );
}

export default function InstructorCommunityPage() {
  const { accessToken, isAuthenticated, loading: authLoading, user } = useAuth();
  const [tab, setTab] = useState<CommunityTab>("reviews");
  const [reviews, setReviews] = useState<ReviewWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState("all");
  const [visibility, setVisibility] = useState<ReviewVisibility>("all");
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>("all");
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [hideTarget, setHideTarget] = useState<ReviewWithCourse | null>(null);
  const [hiding, setHiding] = useState(false);
  const [hideError, setHideError] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [recentlyHidden, setRecentlyHidden] = useState<ReviewWithCourse | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [notice, setNotice] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState("");
  const [replyErrorId, setReplyErrorId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [openReplyMenuId, setOpenReplyMenuId] = useState<string | null>(null);
  const [deleteReplyTarget, setDeleteReplyTarget] = useState<ReviewWithCourse | null>(null);
  const replyMenuRef = useRef<HTMLDivElement>(null);
  const hideDialogRef = useRef<HTMLElement>(null);
  const hideCancelRef = useRef<HTMLButtonElement>(null);
  const hideTriggerRef = useRef<HTMLButtonElement>(null);

  const loadReviews = useCallback(async () => {
    if (!accessToken || !isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const coursePage = await fetchInstructorCourses(accessToken);
      const results: ReviewWithCourse[] = [];
      for (let index = 0; index < coursePage.data.length; index += reviewCourseConcurrency) {
        const courseBatch = coursePage.data.slice(index, index + reviewCourseConcurrency);
        const batchResults = await Promise.all(
          courseBatch.map(async (course: InstructorCourse) => {
            const courseReviews = await fetchAllInstructorCourseReviews(course.id, accessToken);
            return courseReviews.map((review) => ({ ...review, courseTitle: course.title }));
          }),
        );
        results.push(...batchResults.flat());
      }
      setReviews(results.flat().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
    } catch (loadError) {
      setError(
        loadError instanceof ApiClientError
          ? loadError.message
          : "Không thể tải đánh giá. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    if (!authLoading) void loadReviews();
  }, [authLoading, loadReviews]);

  useEffect(() => {
    if (!openReplyMenuId) return;
    const closeMenu = (event: PointerEvent) => {
      if (!replyMenuRef.current?.contains(event.target as Node)) setOpenReplyMenuId(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenReplyMenuId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openReplyMenuId]);

  useEffect(() => {
    if (!hideTarget) return;
    const focusFrame = window.requestAnimationFrame(() => hideCancelRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !hiding) {
        event.preventDefault();
        closeHideDialog();
        return;
      }
      if (event.key !== "Tab" || !hideDialogRef.current) return;
      const focusable = Array.from(
        hideDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hideTarget, hiding]);

  const visibleReviews = useMemo(() => {
    const filtered = reviews.filter(
      (item) =>
        (rating === "all" || item.rating === Number(rating)) &&
        (visibility === "all" || item.status === visibility) &&
        (replyFilter === "all" ||
          (replyFilter === "replied" ? Boolean(item.instructorReply) : !item.instructorReply)),
    );
    return [...filtered].sort((a, b) =>
      sort === "newest"
        ? Date.parse(b.createdAt) - Date.parse(a.createdAt)
        : Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
  }, [rating, replyFilter, reviews, sort, visibility]);

  async function saveReply(review: ReviewWithCourse) {
    if (!accessToken) return;
    const reply = (replyDrafts[review.id] ?? review.instructorReply ?? "").trim();
    if (!reply) {
      setReplyError("Vui lòng nhập nội dung phản hồi.");
      setReplyErrorId(review.id);
      return;
    }
    setSavingReplyId(review.id);
    setReplyError("");
    setReplyErrorId(null);
    try {
      const updated = await saveInstructorReviewReply(
        review.courseId,
        review.id,
        reply,
        accessToken,
      );
      setReviews((current) =>
        current.map((item) => (item.id === review.id ? { ...item, ...updated } : item)),
      );
      setReplyDrafts((current) => ({ ...current, [review.id]: "" }));
      setEditingReplyId(null);
      setOpenReplyMenuId(null);
      setNotice("Đã lưu phản hồi đánh giá.");
    } catch (saveError) {
      setReplyError(
        saveError instanceof ApiClientError
          ? saveError.message
          : "Không thể lưu phản hồi. Vui lòng thử lại.",
      );
      setReplyErrorId(review.id);
    } finally {
      setSavingReplyId(null);
    }
  }

  async function removeReply(review: ReviewWithCourse) {
    if (!accessToken) return;
    setSavingReplyId(review.id);
    setReplyError("");
    setReplyErrorId(null);
    try {
      await deleteInstructorReviewReply(review.courseId, review.id, accessToken);
      setReviews((current) =>
        current.map((item) =>
          item.id === review.id
            ? { ...item, instructorReply: null, instructorRepliedAt: null }
            : item,
        ),
      );
      setReplyDrafts((current) => ({ ...current, [review.id]: "" }));
      setEditingReplyId(null);
      setOpenReplyMenuId(null);
      setDeleteReplyTarget(null);
      setNotice("Đã xóa phản hồi.");
    } catch (deleteError) {
      setReplyError(
        deleteError instanceof ApiClientError ? deleteError.message : "Không thể xóa phản hồi.",
      );
      setReplyErrorId(review.id);
    } finally {
      setSavingReplyId(null);
    }
  }

  async function hideReview() {
    if (!hideTarget || !accessToken) return;
    setHiding(true);
    setHideError("");
    try {
      await setInstructorReviewVisibility(hideTarget.courseId, hideTarget.id, false, accessToken);
      setReviews((current) => current.filter((review) => review.id !== hideTarget.id));
      setRecentlyHidden(hideTarget);
      setNotice("Đã ẩn đánh giá. Bạn có thể khôi phục ngay.");
      closeHideDialog();
    } catch (hideRequestError) {
      setHideError(
        hideRequestError instanceof ApiClientError
          ? hideRequestError.message
          : "Không thể ẩn đánh giá. Vui lòng thử lại.",
      );
    } finally {
      setHiding(false);
    }
  }

  function closeHideDialog() {
    setHideTarget(null);
    window.requestAnimationFrame(() => {
      if (hideTriggerRef.current?.isConnected) hideTriggerRef.current.focus();
      else document.getElementById("community-rating")?.focus();
    });
  }

  async function restoreReview(review = recentlyHidden) {
    if (!review || !accessToken) return;
    setRestoring(true);
    setError("");
    try {
      await setInstructorReviewVisibility(review.courseId, review.id, true, accessToken);
      setReviews((current) => {
        const restored = current.some((item) => item.id === review.id)
          ? current.map((item) => (item.id === review.id ? { ...item, status: "PUBLISHED" } : item))
          : [...current, { ...review, status: "PUBLISHED" }];
        return restored.sort(
          (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
        );
      });
      setRecentlyHidden((current) => (current?.id === review.id ? null : current));
      setNotice("Đã khôi phục đánh giá.");
    } catch (restoreError) {
      setError(
        restoreError instanceof ApiClientError
          ? restoreError.message
          : "Không thể khôi phục đánh giá. Vui lòng thử lại.",
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <section
      className="min-h-full bg-[#f8fafc] p-4 text-[#334155] sm:p-5 lg:p-6"
      aria-labelledby="community-title"
    >
      <header className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h1 id="community-title" className="text-2xl font-semibold text-primary">
            Cộng đồng
          </h1>
          <div className="relative">
            <button
              type="button"
              aria-label="Tùy chọn cộng đồng"
              aria-expanded={optionsOpen}
              aria-haspopup="menu"
              onClick={() => setOptionsOpen((open) => !open)}
              className="focus-ring rounded-md p-2 text-slate-700 transition hover:bg-slate-100 active:bg-slate-200"
            >
              <Ellipsis aria-hidden="true" size={22} />
            </button>
            {optionsOpen ? (
              <div
                role="menu"
                aria-label="Tùy chọn cộng đồng"
                className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={loading || tab !== "reviews"}
                  onClick={() => {
                    setOptionsOpen(false);
                    void loadReviews();
                  }}
                  className="focus-ring flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Tải lại đánh giá
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div
          className="mt-3 flex gap-2 overflow-x-auto"
          role="tablist"
          aria-label="Nội dung cộng đồng"
        >
          {(
            [
              ["reviews", "Đánh giá"],
              ["messages", "Tin nhắn"],
              ["notifications", "Thông báo"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              id={`community-tab-${value}`}
              type="button"
              role="tab"
              aria-selected={tab === value}
              aria-controls="community-panel"
              onClick={() => setTab(value)}
              className={`focus-ring min-h-11 shrink-0 border-b-[3px] px-3 text-sm font-semibold transition ${tab === value ? "border-primary text-primary" : "border-transparent text-slate-600 hover:text-slate-900"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div
        id="community-panel"
        role="tabpanel"
        aria-labelledby={`community-tab-${tab}`}
        className="pt-6"
      >
        {notice ? (
          <p
            role="status"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            <span>{notice}</span>
            {recentlyHidden ? (
              <button
                type="button"
                disabled={restoring}
                onClick={() => void restoreReview()}
                className="focus-ring min-h-8 rounded-md px-2 font-semibold text-primary underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-60"
              >
                {restoring ? "Đang khôi phục…" : "Hoàn tác"}
              </button>
            ) : null}
          </p>
        ) : null}
        {tab === "reviews" ? (
          <>
            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <fieldset className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="replied-filter"
                    checked={replyFilter === "replied"}
                    onChange={(event) => setReplyFilter(event.target.checked ? "replied" : "all")}
                    className="h-[18px] w-[18px] rounded border-slate-400 accent-primary"
                  />
                  <label htmlFor="replied-filter" className="text-sm text-slate-600">
                    Đã trả lời
                  </label>
                </fieldset>
                <fieldset className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="unreplied-filter"
                    checked={replyFilter === "unreplied"}
                    onChange={(event) => setReplyFilter(event.target.checked ? "unreplied" : "all")}
                    className="h-[18px] w-[18px] rounded border-slate-400 accent-primary"
                  />
                  <label htmlFor="unreplied-filter" className="text-sm text-slate-600">
                    Chưa trả lời
                  </label>
                </fieldset>
                <label
                  className="flex items-center gap-2 text-sm text-slate-400"
                  htmlFor="community-visibility"
                >
                  Hiển thị:
                  <select
                    id="community-visibility"
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value as ReviewVisibility)}
                    className="focus-ring min-h-10 rounded-md border-0 bg-transparent py-1 text-sm text-slate-700"
                  >
                    <option value="all">Tất cả</option>
                    <option value="PUBLISHED">Đang công khai</option>
                    <option value="HIDDEN">Đã ẩn</option>
                  </select>
                </label>
                <label
                  className="flex items-center gap-2 text-sm text-slate-400"
                  htmlFor="community-rating"
                >
                  Đánh giá:
                  <select
                    id="community-rating"
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                    className="focus-ring min-h-10 rounded-md border-0 bg-transparent py-1 text-sm text-slate-700"
                  >
                    <option value="all">Tất cả</option>
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value} sao
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  className="flex items-center gap-2 text-sm text-slate-400"
                  htmlFor="community-sort"
                >
                  Sắp xếp:
                  <select
                    id="community-sort"
                    value={sort}
                    onChange={(event) => setSort(event.target.value as ReviewSort)}
                    className="focus-ring min-h-10 rounded-md border-0 bg-transparent py-1 text-sm text-slate-700"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                disabled={loading || reviews.length === 0}
                onClick={() => downloadCsv(visibleReviews)}
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763] disabled:cursor-not-allowed disabled:opacity-50 xl:self-auto"
              >
                <Download size={16} aria-hidden="true" /> Xuất CSV
              </button>
            </div>

            {!isAuthenticated && !authLoading ? (
              <EmptyState
                title="Vui lòng đăng nhập"
                description="Đăng nhập bằng tài khoản giảng viên để xem đánh giá khóa học."
              />
            ) : null}
            {loading || authLoading ? (
              <div className="space-y-4" aria-label="Đang tải đánh giá" aria-busy="true">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : null}
            {error && !loading ? (
              <div
                className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
                role="alert"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void loadReviews()}
                  className="focus-ring mt-2 rounded font-semibold underline"
                >
                  Thử tải lại
                </button>
              </div>
            ) : null}
            {!loading && !error && isAuthenticated && visibleReviews.length === 0 ? (
              <EmptyState
                title="Chưa có đánh giá"
                description={
                  visibility === "HIDDEN"
                    ? "Đánh giá bạn đã ẩn sẽ xuất hiện tại đây."
                    : "Đánh giá của học viên sẽ hiển thị tại đây khi khóa học của bạn nhận được đánh giá."
                }
              />
            ) : null}

            {!loading && !error && visibleReviews.length > 0 ? (
              <div className="space-y-3">
                {visibleReviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_0_8px_rgba(59,130,246,0.08)] sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex items-center gap-1"
                        aria-label={`${review.rating} trên 5 sao`}
                      >
                        <span className="mr-1 text-sm font-medium text-slate-600">Đánh giá:</span>
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            size={18}
                            aria-hidden="true"
                            className={
                              index < review.rating
                                ? "fill-[#eab308] text-[#eab308]"
                                : "text-slate-300"
                            }
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {review.status === "HIDDEN" ? (
                          <button
                            type="button"
                            disabled={restoring}
                            onClick={() => void restoreReview(review)}
                            className="focus-ring rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-emerald-50 disabled:opacity-60"
                          >
                            {restoring ? "Đang khôi phục…" : "Công khai lại"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Ẩn đánh giá của ${review.studentName}`}
                            onClick={(event) => {
                              hideTriggerRef.current = event.currentTarget;
                              setHideTarget(review);
                              setHideError("");
                            }}
                            className="focus-ring -mr-2 -mt-2 rounded-md p-2 text-slate-900 hover:bg-slate-100"
                          >
                            <Ellipsis size={20} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      Tên khóa học:{" "}
                      <span className="font-semibold text-primary">{review.courseTitle}</span>
                    </p>
                    {review.status === "HIDDEN" ? (
                      <p className="mt-2 w-fit rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        Đã ẩn khỏi trang khóa học
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <ReviewStudentIdentity
                        studentId={review.studentId}
                        studentName={review.studentName}
                        studentAvatarUrl={review.studentAvatarUrl}
                        createdAt={review.createdAt}
                      />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                      {review.comment}
                    </p>
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {review.instructorReply && editingReplyId !== review.id ? (
                        <div className="flex items-start gap-2.5">
                          <UserAvatar
                            name={user?.fullName ?? "Giảng viên"}
                            avatarUrl={user?.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1 rounded-xl bg-[#f2f4f7] px-3.5 py-2.5">
                                <p className="text-xs font-semibold text-slate-900">
                                  {user?.fullName ?? "Phản hồi của giảng viên"}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                  {review.instructorReply}
                                </p>
                                {review.instructorRepliedAt ? (
                                  <time
                                    dateTime={review.instructorRepliedAt}
                                    className="mt-1 block text-[11px] text-slate-400"
                                  >
                                    {formatDate(review.instructorRepliedAt)}
                                  </time>
                                ) : null}
                              </div>
                              <div
                                className="relative"
                                ref={openReplyMenuId === review.id ? replyMenuRef : null}
                              >
                                <button
                                  type="button"
                                  aria-label="Tùy chọn phản hồi"
                                  aria-expanded={openReplyMenuId === review.id}
                                  aria-haspopup="menu"
                                  onClick={() =>
                                    setOpenReplyMenuId((current) =>
                                      current === review.id ? null : review.id,
                                    )
                                  }
                                  className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                                >
                                  <Ellipsis size={18} aria-hidden="true" />
                                </button>
                                {openReplyMenuId === review.id ? (
                                  <div
                                    role="menu"
                                    className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setReplyDrafts((current) => ({
                                          ...current,
                                          [review.id]: review.instructorReply ?? "",
                                        }));
                                        setEditingReplyId(review.id);
                                        setOpenReplyMenuId(null);
                                        setReplyError("");
                                        setReplyErrorId(null);
                                      }}
                                      className="focus-ring flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                      Chỉnh sửa
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setDeleteReplyTarget(review);
                                        setOpenReplyMenuId(null);
                                        setReplyError("");
                                        setReplyErrorId(null);
                                      }}
                                      className="focus-ring flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                      Xóa phản hồi
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2.5">
                          <UserAvatar
                            name={user?.fullName ?? "Giảng viên"}
                            avatarUrl={user?.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <label
                              htmlFor={`reply-${review.id}`}
                              className="mb-1.5 block text-xs font-medium text-slate-600"
                            >
                              {review.instructorReply ? "Chỉnh sửa phản hồi" : "Trả lời đánh giá"}
                            </label>
                            <textarea
                              id={`reply-${review.id}`}
                              rows={2}
                              maxLength={2000}
                              value={replyDrafts[review.id] ?? ""}
                              onChange={(event) =>
                                setReplyDrafts((current) => ({
                                  ...current,
                                  [review.id]: event.target.value,
                                }))
                              }
                              placeholder="Viết phản hồi lịch sự và hữu ích…"
                              className="focus-ring w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                            <ReplyEditorActions
                              review={review}
                              draft={replyDrafts[review.id] ?? ""}
                              saving={savingReplyId === review.id}
                              error={replyErrorId === review.id ? replyError : ""}
                              onCancel={() => {
                                setReplyDrafts((current) => ({ ...current, [review.id]: "" }));
                                setEditingReplyId(null);
                                setReplyError("");
                                setReplyErrorId(null);
                              }}
                              onSave={() => void saveReply(review)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
                <p className="text-center text-xs text-slate-500">
                  Đang hiển thị toàn bộ đánh giá của các khóa học.
                </p>
              </div>
            ) : null}
          </>
        ) : tab === "messages" ? (
          <InstructorMessagesPanel />
        ) : (
          <InstructorNotificationsPanel />
        )}
      </div>

      {hideTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !hiding) closeHideDialog();
          }}
        >
          <section
            ref={hideDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="hide-review-title"
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl sm:p-6"
          >
            <h2 id="hide-review-title" className="text-lg font-semibold text-slate-900">
              Ẩn đánh giá này?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Đánh giá sẽ không còn hiển thị công khai trên khóa học.
            </p>
            {hideError ? (
              <p role="alert" className="mt-3 text-sm text-rose-700">
                {hideError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                ref={hideCancelRef}
                disabled={hiding}
                onClick={closeHideDialog}
                className="focus-ring min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={hiding}
                onClick={() => void hideReview()}
                className="focus-ring min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {hiding ? "Đang ẩn…" : "Ẩn đánh giá"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {deleteReplyTarget ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && savingReplyId !== deleteReplyTarget.id) {
              setDeleteReplyTarget(null);
              setReplyError("");
              setReplyErrorId(null);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-review-reply-title"
            aria-describedby="delete-review-reply-description"
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl sm:p-6"
          >
            <h2 id="delete-review-reply-title" className="text-lg font-semibold text-slate-900">
              Xóa phản hồi này?
            </h2>
            <p
              id="delete-review-reply-description"
              className="mt-2 text-sm leading-6 text-slate-600"
            >
              Phản hồi sẽ bị gỡ khỏi đánh giá của học viên.
            </p>
            {replyErrorId === deleteReplyTarget.id ? (
              <p role="alert" className="mt-3 text-sm text-rose-700">
                {replyError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={savingReplyId === deleteReplyTarget.id}
                onClick={() => {
                  setDeleteReplyTarget(null);
                  setReplyError("");
                  setReplyErrorId(null);
                }}
                className="focus-ring min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savingReplyId === deleteReplyTarget.id}
                onClick={() => void removeReply(deleteReplyTarget)}
                className="focus-ring min-h-10 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {savingReplyId === deleteReplyTarget.id ? "Đang xóa…" : "Xóa phản hồi"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      {icon ? <span className="mb-3 text-slate-400">{icon}</span> : null}
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
