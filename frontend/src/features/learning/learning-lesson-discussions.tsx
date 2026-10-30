"use client";

import {
  Check,
  CheckCircle2,
  CornerDownRight,
  LoaderCircle,
  MessageSquare,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  addDiscussionComment,
  createLessonDiscussion,
  deleteDiscussion,
  deleteDiscussionComment,
  fetchDiscussionDetail,
  fetchLessonDiscussions,
  updateDiscussionStatus,
  type DiscussionComment,
  type DiscussionDetail,
  type DiscussionItem,
} from "@/lib/discussion-client";
import { cn } from "@/lib/cn";

export function formatVideoTime(totalSeconds: number): string {
  const rounded = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

type Props = {
  lessonId: string;
  isVideoLesson: boolean;
  currentVideoTime: number;
  getAccessToken: () => Promise<string | null>;
  onSeekVideo?: (seconds: number) => void;
};

export function LearningLessonDiscussions({
  lessonId,
  isVideoLesson,
  currentVideoTime,
  getAccessToken,
  onSeekVideo,
}: Props) {
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [onlyTimestamp, setOnlyTimestamp] = useState(false);
  const [sortBy, setSortBy] = useState<"latest" | "timestamp" | "oldest">("latest");

  // New question form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [attachTimestamp, setAttachTimestamp] = useState(false);
  const [timestampValue, setTimestampValue] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Expanded discussion details (threads)
  const [expandedDiscussionId, setExpandedDiscussionId] = useState<string | null>(null);
  const [activeDiscussionDetail, setActiveDiscussionDetail] = useState<DiscussionDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState("");

  const loadDiscussions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");
      const res = await fetchLessonDiscussions(token, lessonId, {
        page: 0,
        size: 50,
        sort: sortBy,
        search: search.trim() ? search.trim() : undefined,
        hasTimestamp: onlyTimestamp ? true : undefined,
      });
      setDiscussions(res.data);
      setTotalCount(res.meta?.totalElements ?? res.data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa thể tải danh sách thảo luận.");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, lessonId, onlyTimestamp, search, sortBy]);

  useEffect(() => {
    void loadDiscussions();
  }, [loadDiscussions]);

  // When opening new question form, initialize timestamp checkbox with current playback
  function handleOpenNewForm() {
    setShowNewForm(true);
    setFormError("");
    if (isVideoLesson) {
      setAttachTimestamp(true);
      setTimestampValue(Math.floor(currentVideoTime));
    }
  }

  async function handleCreateDiscussion(event: React.FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) {
      setFormError("Vui lòng nhập tiêu đề câu hỏi.");
      return;
    }
    if (newTitle.trim().length < 3 || newTitle.trim().length > 200) {
      setFormError("Tiêu đề câu hỏi phải từ 3 đến 200 ký tự.");
      return;
    }
    if (!newBody.trim() || newBody.trim().length < 3) {
      setFormError("Vui lòng nhập nội dung câu hỏi chi tiết hơn (tối thiểu 3 ký tự).");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");
      const created = await createLessonDiscussion(token, lessonId, {
        title: newTitle.trim(),
        body: newBody.trim(),
        videoTimestampSeconds: attachTimestamp && timestampValue !== null ? timestampValue : null,
      });
      setDiscussions((prev) => [created, ...prev]);
      setTotalCount((c) => c + 1);
      setNewTitle("");
      setNewBody("");
      setShowNewForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không thể gửi câu hỏi. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleExpandDiscussion(id: string) {
    if (expandedDiscussionId === id) {
      setExpandedDiscussionId(null);
      setActiveDiscussionDetail(null);
      return;
    }
    setExpandedDiscussionId(id);
    setDetailLoading(true);
    setReplyError("");
    setReplyText("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");
      const detail = await fetchDiscussionDetail(token, id);
      setActiveDiscussionDetail(detail);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Chưa thể tải nội dung phản hồi.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!expandedDiscussionId || !replyText.trim()) return;

    setReplying(true);
    setReplyError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");
      const newComment = await addDiscussionComment(token, expandedDiscussionId, {
        body: replyText.trim(),
      });
      setActiveDiscussionDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          commentCount: prev.commentCount + 1,
          comments: [...prev.comments, newComment],
        };
      });
      setDiscussions((prev) =>
        prev.map((item) =>
          item.id === expandedDiscussionId
            ? { ...item, commentCount: item.commentCount + 1 }
            : item,
        ),
      );
      setReplyText("");
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Chưa thể gửi phản hồi.");
    } finally {
      setReplying(false);
    }
  }

  async function handleDeleteDiscussion(id: string) {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      await deleteDiscussion(token, id);
      setDiscussions((prev) => prev.filter((item) => item.id !== id));
      setTotalCount((c) => Math.max(0, c - 1));
      if (expandedDiscussionId === id) {
        setExpandedDiscussionId(null);
        setActiveDiscussionDetail(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chưa thể xóa câu hỏi.");
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!expandedDiscussionId) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu trả lời này?")) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      await deleteDiscussionComment(token, expandedDiscussionId, commentId);
      setActiveDiscussionDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          commentCount: Math.max(0, prev.commentCount - 1),
          comments: prev.comments.filter((c) => c.id !== commentId),
        };
      });
      setDiscussions((prev) =>
        prev.map((item) =>
          item.id === expandedDiscussionId
            ? { ...item, commentCount: Math.max(0, item.commentCount - 1) }
            : item,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chưa thể xóa phản hồi.");
    }
  }

  async function handleToggleStatus(item: DiscussionItem) {
    const nextStatus = item.status === "RESOLVED" ? "OPEN" : "RESOLVED";
    try {
      const token = await getAccessToken();
      if (!token) return;
      const updated = await updateDiscussionStatus(token, item.id, nextStatus);
      setDiscussions((prev) =>
        prev.map((d) => (d.id === item.id ? { ...d, status: updated.status } : d)),
      );
      if (activeDiscussionDetail && activeDiscussionDetail.id === item.id) {
        setActiveDiscussionDetail({ ...activeDiscussionDetail, status: updated.status });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chưa thể cập nhật trạng thái.");
    }
  }

  return (
    <section aria-labelledby="lesson-qa-heading" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="lesson-qa-heading" className="text-lg font-bold text-[#101a2c]">
            Hỏi đáp & Thảo luận bài học
          </h2>
          <p className="mt-0.5 text-xs text-[#718079]">
            {totalCount > 0
              ? `${totalCount} câu hỏi từ học viên và giải đáp của giảng viên`
              : "Trao đổi với giảng viên và các bạn học về nội dung bài giảng"}
          </p>
        </div>
        {!showNewForm ? (
          <button
            type="button"
            onClick={handleOpenNewForm}
            className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#159e75]"
          >
            <Plus className="h-4 w-4" />
            Đặt câu hỏi mới
          </button>
        ) : null}
      </div>

      {/* New Question Form */}
      {showNewForm ? (
        <form
          onSubmit={handleCreateDiscussion}
          className="rounded-xl border border-primary/30 bg-[#f4faf7] p-5 shadow-sm transition"
        >
          <div className="flex items-center justify-between border-b border-[#e1eee7] pb-3">
            <h3 className="text-sm font-bold text-primary">Đặt câu hỏi / thảo luận cho bài học</h3>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="text-xs font-medium text-[#718079] hover:text-[#101a2c]"
            >
              Đóng
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="qa-title" className="block text-xs font-semibold text-[#101a2c]">
                Tiêu đề câu hỏi <span className="text-rose-600">*</span>
              </label>
              <input
                id="qa-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ví dụ: Đoạn giải thích thuật toán ở phút thứ 2 chưa hiểu..."
                className="focus-ring mt-1.5 w-full rounded-lg border border-[#d6e3dc] bg-white px-3.5 py-2 text-sm text-[#101a2c] placeholder:text-[#94a39b]"
                maxLength={200}
                required
              />
            </div>

            <div>
              <label htmlFor="qa-body" className="block text-xs font-semibold text-[#101a2c]">
                Chi tiết thắc mắc <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="qa-body"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={3}
                placeholder="Mô tả cụ thể khó khăn hoặc thắc mắc của bạn để giảng viên và bạn học hỗ trợ nhanh nhất..."
                className="focus-ring mt-1.5 w-full rounded-lg border border-[#d6e3dc] bg-white p-3.5 text-sm text-[#101a2c] placeholder:text-[#94a39b]"
                required
              />
            </div>

            {isVideoLesson ? (
              <div className="rounded-lg border border-[#d8e6df] bg-white p-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={attachTimestamp}
                    onChange={(e) => {
                      setAttachTimestamp(e.target.checked);
                      if (e.target.checked && timestampValue === null) {
                        setTimestampValue(Math.floor(currentVideoTime));
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-[#101a2c]">
                      Gắn với mốc video hiện tại (
                      <span className="text-primary font-mono font-bold">
                        {formatVideoTime(timestampValue ?? Math.floor(currentVideoTime))}
                      </span>
                      )
                    </span>
                    <p className="mt-0.5 text-[#718079]">
                      Giúp giảng viên và người xem bấm vào là nhảy ngay tới đoạn video bài giảng
                      này.
                    </p>
                  </div>
                </label>
                {attachTimestamp ? (
                  <div className="mt-2.5 flex items-center gap-2 pl-7">
                    <button
                      type="button"
                      onClick={() => setTimestampValue(Math.floor(currentVideoTime))}
                      className="focus-ring inline-flex items-center gap-1.5 rounded bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-[#d6f2e8]"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Lấy mốc đang phát: {formatVideoTime(Math.floor(currentVideoTime))}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {formError ? (
              <p role="alert" className="text-xs font-medium text-rose-600">
                {formError}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="focus-ring rounded-lg border border-[#d6e3dc] bg-white px-4 py-2 text-xs font-semibold text-[#54625c] hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#159e75] disabled:opacity-60"
              >
                {submitting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                {submitting ? "Đang gửi..." : "Gửi câu hỏi"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#e4ece8] bg-[#fbfdfc] p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94a39b]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm câu hỏi..."
            className="focus-ring w-full rounded-lg border border-[#dce6e1] bg-white py-1.5 pl-9 pr-3 text-xs text-[#101a2c] placeholder:text-[#94a39b]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isVideoLesson ? (
            <button
              type="button"
              onClick={() => setOnlyTimestamp(!onlyTimestamp)}
              aria-pressed={onlyTimestamp}
              className={cn(
                "focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition",
                onlyTimestamp
                  ? "border-primary bg-primary text-white"
                  : "border-[#dce6e1] bg-white text-[#54625c] hover:border-primary hover:text-primary",
              )}
            >
              <Play className="h-3 w-3 fill-current" />
              Có mốc video
            </button>
          ) : null}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "latest" | "timestamp" | "oldest")}
            className="focus-ring h-8 rounded-lg border border-[#dce6e1] bg-white px-2.5 text-xs font-semibold text-[#54625c]"
          >
            <option value="latest">Mới nhất</option>
            {isVideoLesson ? <option value="timestamp">Theo mốc video</option> : null}
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
      </div>

      {/* List / States */}
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-24 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
          <p className="text-xs text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadDiscussions()}
            className="focus-ring mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary underline"
          >
            <RotateCcw className="h-3 w-3" /> Thử lại
          </button>
        </div>
      ) : discussions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dce6e1] bg-[#fafcfb] p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e8faf4] text-primary">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#101a2c]">Chưa có thảo luận nào</h3>
          <p className="mt-1 text-xs text-[#718079]">
            {search || onlyTimestamp
              ? "Không tìm thấy câu hỏi phù hợp với bộ lọc."
              : "Hãy là người đầu tiên đặt câu hỏi để giảng viên và các bạn cùng giải đáp!"}
          </p>
          {!showNewForm && (
            <button
              type="button"
              onClick={handleOpenNewForm}
              className="focus-ring mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-white transition hover:bg-[#159e75]"
            >
              <Plus className="h-3.5 w-3.5" />
              Đặt câu hỏi ngay
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {discussions.map((item) => {
            const isExpanded = expandedDiscussionId === item.id;
            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-xl border bg-white p-4 transition-all shadow-sm",
                  isExpanded
                    ? "border-primary/50 ring-1 ring-primary/20"
                    : "border-[#e3ede8] hover:border-[#b8d6cb]",
                )}
              >
                {/* Header author info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {item.authorAvatarUrl ? (
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200">
                        <Image
                          unoptimized
                          src={item.authorAvatarUrl}
                          alt={item.authorName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8faf4] font-bold text-primary">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#101a2c]">{item.authorName}</span>
                        {item.isCourseInstructor ? (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            Giảng viên
                          </span>
                        ) : null}
                        {item.status === "RESOLVED" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200">
                            <CheckCircle2 className="h-3 w-3" /> Đã giải đáp
                          </span>
                        ) : null}
                      </div>
                      <time className="text-[11px] text-[#84908b]">
                        {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                  </div>

                  {/* Timestamp seek button */}
                  {item.videoTimestampSeconds !== null && onSeekVideo ? (
                    <button
                      type="button"
                      onClick={() => onSeekVideo(item.videoTimestampSeconds!)}
                      title={`Nhảy tới video tại ${formatVideoTime(item.videoTimestampSeconds)}`}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-[#20B486]/40 bg-[#e8faf4] px-2.5 py-1 text-xs font-bold text-primary transition hover:bg-primary hover:text-white"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      {formatVideoTime(item.videoTimestampSeconds)}
                    </button>
                  ) : null}
                </div>

                {/* Question title & body */}
                <div className="mt-3">
                  <h4 className="text-sm font-bold text-[#101a2c]">{item.title}</h4>
                  <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-[#45534d]">
                    {item.body}
                  </p>
                </div>

                {/* Actions & comment toggle */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f4f2] pt-3 text-xs text-[#718079]">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => void toggleExpandDiscussion(item.id)}
                      className="focus-ring inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {item.commentCount > 0
                        ? `${item.commentCount} câu trả lời`
                        : "Chưa có phản hồi · Trả lời"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(item)}
                      className="focus-ring text-[11px] font-medium text-[#718079] hover:text-[#101a2c]"
                    >
                      {item.status === "RESOLVED" ? "Mở lại câu hỏi" : "Đánh dấu đã hiểu"}
                    </button>
                  </div>

                  {item.canDelete ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteDiscussion(item.id)}
                      className="focus-ring inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  ) : null}
                </div>

                {/* Expanded Thread Details & Replies */}
                {isExpanded ? (
                  <div className="mt-4 border-t border-[#e3ede8] pt-4">
                    {detailLoading ? (
                      <div className="py-4 text-center">
                        <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-primary" />
                        <span className="mt-1 block text-xs text-[#718079]">
                          Đang tải câu trả lời...
                        </span>
                      </div>
                    ) : activeDiscussionDetail ? (
                      <div className="space-y-3">
                        {activeDiscussionDetail.comments.length > 0 ? (
                          <div className="space-y-2.5 pl-2 sm:pl-4 border-l-2 border-[#e1eee7]">
                            {activeDiscussionDetail.comments.map((comment: DiscussionComment) => (
                              <div
                                key={comment.id}
                                className={cn(
                                  "rounded-lg p-3 text-xs transition",
                                  comment.isCourseInstructor
                                    ? "border border-emerald-200 bg-[#eefaf5]"
                                    : "border border-[#e6eee9] bg-[#fbfdfc]",
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {comment.authorAvatarUrl ? (
                                      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full">
                                        <Image
                                          unoptimized
                                          src={comment.authorAvatarUrl}
                                          alt={comment.authorName}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[10px] font-bold">
                                        {comment.authorName.charAt(0)}
                                      </div>
                                    )}
                                    <span className="font-bold text-[#101a2c]">
                                      {comment.authorName}
                                    </span>
                                    {comment.isCourseInstructor ? (
                                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                                        <Check className="h-3 w-3" /> Giảng viên giải đáp
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <time className="text-[10px] text-[#84908b]">
                                      {new Date(comment.createdAt).toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </time>
                                    {comment.canDelete ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleDeleteComment(comment.id)}
                                        className="text-rose-500 hover:text-rose-700"
                                        title="Xóa phản hồi"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-[#38433e]">
                                  {comment.body}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs italic text-[#84908b]">
                            Chưa có câu trả lời nào. Hãy viết giải đáp bên dưới.
                          </p>
                        )}

                        {/* Reply Form */}
                        <form onSubmit={handleSendReply} className="mt-3 flex gap-2">
                          <div className="relative flex-1">
                            <CornerDownRight className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94a39b]" />
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Viết câu trả lời hoặc trao đổi thêm..."
                              className="focus-ring w-full rounded-lg border border-[#d6e3dc] bg-white py-2 pl-9 pr-3 text-xs text-[#101a2c] placeholder:text-[#94a39b]"
                              required
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={replying || !replyText.trim()}
                            className="focus-ring self-end rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#159e75] disabled:opacity-50"
                          >
                            {replying ? "Đang gửi..." : "Gửi"}
                          </button>
                        </form>
                        {replyError ? (
                          <p role="alert" className="text-xs text-rose-600">
                            {replyError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
