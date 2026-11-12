"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MessageCircle,
  MessageSquareText,
  Search,
  Send,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";
import {
  addDiscussionComment,
  fetchCourseDiscussions,
  fetchDiscussionDetail,
  updateDiscussionStatus,
  type DiscussionDetail,
  type DiscussionItem,
} from "@/lib/discussion-client";
import { fetchMyEnrollments, type Enrollment } from "@/lib/learning-client";

type StatusFilter = "ALL" | "OPEN" | "RESOLVED";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

function formatVideoTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function StudentDiscussionsView() {
  const { user, getAccessToken } = useAuthSession();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DiscussionDetail | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [commentBody, setCommentBody] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const loadEnrollments = useCallback(async () => {
    setLoadingCourses(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      try {
        const page = await fetchMyEnrollments(token);
        const activeCourses = page.data.filter((item) => item.courseStatus === "PUBLISHED");
        const list = activeCourses.length > 0 ? activeCourses : page.data;
        setEnrollments(list);
        setSelectedCourseId((current) =>
          current && list.some((item) => item.courseId === current)
            ? current
            : (list[0]?.courseId ?? ""),
        );
      } catch (reason) {
        if (reason instanceof ApiClientError && reason.code === "STUDENT_REQUIRED") {
          setEnrollments([]);
          setSelectedCourseId("");
          return;
        }
        throw reason;
      }
    } catch (reason) {
      setError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không thể tải danh sách khóa học.",
      );
    } finally {
      setLoadingCourses(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  const loadCourseDiscussions = useCallback(
    async (courseId: string) => {
      if (!courseId) {
        setDiscussions([]);
        setSelectedDiscussionId(null);
        setDetail(null);
        return;
      }
      setLoadingDiscussions(true);
      setError("");
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        const page = await fetchCourseDiscussions(token, courseId, { page: 0, size: 50 });
        setDiscussions(page.data);
        setSelectedDiscussionId((current) =>
          current && page.data.some((item) => item.id === current)
            ? current
            : (page.data[0]?.id ?? null),
        );
      } catch (reason) {
        setError(
          reason instanceof ApiClientError
            ? reason.message
            : reason instanceof Error
              ? reason.message
              : "Không thể tải danh sách thảo luận.",
        );
      } finally {
        setLoadingDiscussions(false);
      }
    },
    [getAccessToken],
  );

  useEffect(() => {
    if (selectedCourseId) {
      void loadCourseDiscussions(selectedCourseId);
    }
  }, [loadCourseDiscussions, selectedCourseId]);

  useEffect(() => {
    if (!selectedDiscussionId) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoadingDetail(true);
    setDetailError("");
    void getAccessToken()
      .then(async (token) => {
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        const loaded = await fetchDiscussionDetail(token, selectedDiscussionId);
        if (active) setDetail(loaded);
      })
      .catch((reason) => {
        if (active) {
          setDetailError(
            reason instanceof ApiClientError
              ? reason.message
              : reason instanceof Error
                ? reason.message
                : "Không thể tải chi tiết thảo luận.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });
    return () => {
      active = false;
    };
  }, [getAccessToken, selectedDiscussionId]);

  const visibleDiscussions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    return discussions.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!query) return true;
      return `${item.title} ${item.body} ${item.authorName}`
        .toLocaleLowerCase("vi")
        .includes(query);
    });
  }, [discussions, search, statusFilter]);

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !commentBody.trim() || submittingComment) return;
    setSubmittingComment(true);
    setDetailError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const created = await addDiscussionComment(token, detail.id, { body: commentBody.trim() });
      setDetail((current) =>
        current
          ? {
              ...current,
              commentCount: current.commentCount + 1,
              comments: [...current.comments, created],
            }
          : current,
      );
      setDiscussions((current) =>
        current.map((item) =>
          item.id === detail.id ? { ...item, commentCount: item.commentCount + 1 } : item,
        ),
      );
      setCommentBody("");
    } catch (reason) {
      setDetailError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không thể gửi phản hồi lúc này.",
      );
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleToggleStatus() {
    if (!detail || updatingStatus) return;
    const nextStatus = detail.status === "RESOLVED" ? "OPEN" : "RESOLVED";
    setUpdatingStatus(true);
    setDetailError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const updated = await updateDiscussionStatus(token, detail.id, nextStatus);
      setDetail((current) => (current ? { ...current, status: updated.status } : current));
      setDiscussions((current) =>
        current.map((item) => (item.id === detail.id ? { ...item, status: updated.status } : item)),
      );
    } catch (reason) {
      setDetailError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không thể cập nhật trạng thái câu hỏi.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loadingCourses) {
    return (
      <div className="space-y-4" aria-label="Đang tải thảo luận" aria-busy="true">
        <div className="skeleton h-16 rounded-2xl" />
        <div className="skeleton h-[460px] rounded-2xl" />
      </div>
    );
  }

  if (error && enrollments.length === 0) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-rose-800">{error}</p>
        <button
          type="button"
          onClick={() => void loadEnrollments()}
          className="focus-ring mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Thử tải lại
        </button>
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-xs">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-primary">
          <MessageCircle className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-heading">Hỏi đáp & Thảo luận bài học</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Bạn chưa ghi danh khóa học nào. Hãy tham gia một khóa học để đặt câu hỏi và trao đổi cùng
          giảng viên và học viên khác.
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

  const canManageStatus =
    Boolean(detail) && (detail?.authorId === user?.id || Boolean(detail?.canDelete));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-heading">Thảo luận theo khóa học</h2>
          <p className="mt-0.5 text-xs text-muted">
            Theo dõi câu hỏi, phản hồi của giảng viên và đánh dấu đã giải quyết.
          </p>
        </div>
        <div className="w-full sm:w-80">
          <label htmlFor="discussion-course-select" className="sr-only">
            Chọn khóa học
          </label>
          <select
            id="discussion-course-select"
            value={selectedCourseId}
            onChange={(event) => {
              setSelectedCourseId(event.target.value);
              setSelectedDiscussionId(null);
              setMobileDetailOpen(false);
            }}
            className="focus-ring h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-heading"
          >
            {enrollments.map((enrollment) => (
              <option key={enrollment.courseId} value={enrollment.courseId}>
                {enrollment.courseTitle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      <section className="grid min-h-[540px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside
          className={cn(
            mobileDetailOpen ? "hidden lg:flex" : "flex",
            "min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r",
          )}
        >
          <div className="space-y-3 border-b border-slate-100 p-4">
            <label className="relative block">
              <span className="sr-only">Tìm kiếm thảo luận</span>
              <Search
                size={16}
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tiêu đề hoặc nội dung..."
                className="focus-ring h-9.5 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"
              />
            </label>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: "ALL", label: "Tất cả" },
                  { key: "OPEN", label: "Đang mở" },
                  { key: "RESOLVED", label: "Đã giải quyết" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={cn(
                    "focus-ring rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                    statusFilter === tab.key
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-muted hover:text-heading",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingDiscussions ? (
              <div className="space-y-2 p-3" aria-label="Đang tải câu hỏi" aria-busy="true">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="skeleton h-24 rounded-xl" />
                ))}
              </div>
            ) : visibleDiscussions.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <MessageSquareText className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-heading">Chưa có câu hỏi thảo luận</p>
                <p className="mt-1 text-xs text-muted">
                  Bạn có thể đặt câu hỏi trực tiếp bên trong từng bài học của khóa học này.
                </p>
                {selectedCourseId ? (
                  <Link
                    href={`/learning/courses/${encodeURIComponent(selectedCourseId)}`}
                    className="focus-ring mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-white hover:bg-primary-dark"
                  >
                    Vào bài học
                  </Link>
                ) : null}
              </div>
            ) : (
              visibleDiscussions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedDiscussionId(item.id);
                    setMobileDetailOpen(true);
                  }}
                  aria-current={item.id === selectedDiscussionId ? "true" : undefined}
                  className={cn(
                    "focus-ring w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50",
                    item.id === selectedDiscussionId ? "bg-emerald-50/70" : "bg-white",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        item.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {item.status === "RESOLVED" ? "Đã giải quyết" : "Đang mở"}
                    </span>
                    <span className="text-[11px] text-muted">{item.commentCount} phản hồi</span>
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-heading">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{item.body}</p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {item.authorName} · {formatDateTime(item.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <div
          className={cn(
            mobileDetailOpen ? "flex" : "hidden lg:flex",
            "min-h-[540px] min-w-0 flex-col",
          )}
        >
          {loadingDetail ? (
            <div
              className="space-y-4 p-6"
              aria-label="Đang tải chi tiết thảo luận"
              aria-busy="true"
            >
              <div className="skeleton h-8 w-2/3 rounded-lg" />
              <div className="skeleton h-28 w-full rounded-xl" />
              <div className="skeleton h-20 w-full rounded-xl" />
            </div>
          ) : detail ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Quay lại danh sách thảo luận"
                    onClick={() => setMobileDetailOpen(false)}
                    className="focus-ring rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      detail.status === "RESOLVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800",
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {detail.status === "RESOLVED" ? "Đã giải quyết" : "Đang mở"}
                  </span>
                  {detail.videoTimestampSeconds !== null ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-heading">
                      <Clock className="h-3 w-3 text-primary" aria-hidden="true" />
                      {formatVideoTimestamp(detail.videoTimestampSeconds)}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {canManageStatus ? (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => void handleToggleStatus()}
                      className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/40 px-3 text-xs font-semibold text-primary hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {detail.status === "RESOLVED" ? "Mở lại câu hỏi" : "Đánh dấu đã giải quyết"}
                    </button>
                  ) : null}
                  <Link
                    href={`/learning/lessons/${encodeURIComponent(detail.lessonId)}`}
                    className="focus-ring inline-flex h-9 items-center rounded-lg bg-slate-100 px-3 text-xs font-semibold text-heading hover:bg-slate-200"
                  >
                    Mở bài học
                  </Link>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div>
                  <h3 className="text-lg font-bold text-heading">{detail.title}</h3>
                  <div className="mt-2 flex items-center gap-2.5">
                    <UserAvatar
                      name={detail.authorName}
                      avatarUrl={detail.authorAvatarUrl}
                      size="sm"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-heading">{detail.authorName}</span>
                      {detail.isCourseInstructor ? (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                          Giảng viên
                        </span>
                      ) : null}
                      <p className="text-muted">{formatDateTime(detail.createdAt)}</p>
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {detail.body}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Phản hồi ({detail.comments.length})
                  </h4>
                  {detail.comments.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">
                      Chưa có phản hồi nào. Hãy đóng góp câu trả lời của bạn.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {detail.comments.map((comment) => (
                        <li
                          key={comment.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                        >
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              name={comment.authorName}
                              avatarUrl={comment.authorAvatarUrl}
                              size="sm"
                            />
                            <div className="text-xs">
                              <span className="font-semibold text-heading">
                                {comment.authorName}
                              </span>
                              {comment.isCourseInstructor ? (
                                <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                  Giảng viên
                                </span>
                              ) : null}
                              <p className="text-[11px] text-muted">
                                {formatDateTime(comment.createdAt)}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {comment.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {detailError ? (
                  <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {detailError}
                  </p>
                ) : null}
              </div>

              <form
                onSubmit={(event) => void handleCommentSubmit(event)}
                className="border-t border-slate-200 bg-white p-4"
              >
                <div className="flex items-end gap-2">
                  <label htmlFor="discussion-comment-input" className="sr-only">
                    Nhập phản hồi thảo luận
                  </label>
                  <textarea
                    id="discussion-comment-input"
                    rows={2}
                    maxLength={2000}
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="Viết phản hồi hoặc câu trả lời của bạn..."
                    className="focus-ring min-h-11 flex-1 resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !commentBody.trim()}
                    className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span>{submittingComment ? "Đang gửi…" : "Gửi phản hồi"}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="m-auto max-w-sm px-6 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-emerald-200" aria-hidden="true" />
              <p className="mt-3 font-semibold text-heading">Chọn một chủ đề thảo luận</p>
              <p className="mt-1 text-sm text-muted">
                Nội dung câu hỏi và phản hồi của giảng viên sẽ hiển thị tại đây.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
