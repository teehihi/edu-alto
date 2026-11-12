"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ChevronDown, FileText, Plus, SlidersHorizontal, X } from "lucide-react";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";
import {
  createLearningNote,
  deleteLearningNote,
  fetchMyNotes,
  updateLearningNote,
  type LearningNote,
} from "@/lib/learning-client";

export function NotesView() {
  const { getAccessToken } = useAuthSession();
  const [notes, setNotes] = useState<LearningNote[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "title">("newest");
  const [scopeFilter, setScopeFilter] = useState<"all" | "lesson" | "general">("all");
  const [noteQuery, setNoteQuery] = useState("");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const result = await fetchMyNotes(token);
      setNotes(result.data);
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể tải ghi chú lúc này.",
      );
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setMessage("Nhập tiêu đề và nội dung ghi chú.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const input = { title: title.trim(), content: body.trim() };
      if (editingId) await updateLearningNote(token, editingId, input);
      else await createLearningNote(token, input);
      setTitle("");
      setBody("");
      setEditingId(null);
      setShowEditor(false);
      setMessage(
        editingId ? "Ghi chú đã được cập nhật." : "Ghi chú đã được lưu trên tài khoản của bạn.",
      );
      await loadNotes();
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể lưu ghi chú lúc này.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(id: string) {
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await deleteLearningNote(token, id);
      if (editingId === id) {
        setEditingId(null);
        setShowEditor(false);
        setTitle("");
        setBody("");
      }
      await loadNotes();
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể xóa ghi chú lúc này.",
      );
    }
  }
  const filteredNotes = useMemo(() => {
    const query = noteQuery.trim().toLocaleLowerCase("vi");
    const scoped = notes.filter((note) => {
      if (scopeFilter === "lesson" && !note.lessonId) return false;
      if (scopeFilter === "general" && note.lessonId) return false;
      if (!query) return true;
      return `${note.title} ${note.content}`.toLocaleLowerCase("vi").includes(query);
    });
    return [...scoped].sort((first, second) => {
      if (sortOrder === "title") {
        return first.title.localeCompare(second.title, "vi");
      }
      const firstTime = Date.parse(first.updatedAt);
      const secondTime = Date.parse(second.updatedAt);
      return sortOrder === "oldest" ? firstTime - secondTime : secondTime - firstTime;
    });
  }, [noteQuery, notes, scopeFilter, sortOrder]);

  const sortLabel =
    sortOrder === "newest" ? "Mới nhất" : sortOrder === "oldest" ? "Cũ nhất" : "Tiêu đề A–Z";
  const filterLabel =
    scopeFilter === "all" ? "Tất cả" : scopeFilter === "lesson" ? "Gắn bài học" : "Ghi chú chung";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-primary">Ghi chú</h1>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <button
              type="button"
              aria-expanded={sortMenuOpen}
              onClick={() => {
                setSortMenuOpen((open) => !open);
                setFilterMenuOpen(false);
              }}
              className="focus-ring flex h-9 items-center gap-2 rounded-md border border-primary px-3 text-xs text-primary hover:bg-emerald-50/70"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Xếp theo: {sortLabel}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {sortMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
              >
                {(
                  [
                    { key: "newest", label: "Mới nhất" },
                    { key: "oldest", label: "Cũ nhất" },
                    { key: "title", label: "Tiêu đề A–Z" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sortOrder === option.key}
                    onClick={() => {
                      setSortOrder(option.key);
                      setSortMenuOpen(false);
                    }}
                    className="focus-ring flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-medium text-heading hover:bg-emerald-50"
                  >
                    <span>{option.label}</span>
                    {sortOrder === option.key ? (
                      <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              aria-expanded={filterMenuOpen}
              onClick={() => {
                setFilterMenuOpen((open) => !open);
                setSortMenuOpen(false);
              }}
              className="focus-ring flex h-9 items-center gap-2 rounded-md border border-primary px-3 text-xs text-primary hover:bg-emerald-50/70"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Lọc: {filterLabel}
            </button>
            {filterMenuOpen ? (
              <div
                role="dialog"
                aria-label="Lọc ghi chú"
                className="absolute right-0 top-full z-20 mt-1 w-64 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Phạm vi ghi chú
                  </p>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {(
                      [
                        { key: "all", label: "Tất cả" },
                        { key: "lesson", label: "Gắn bài học" },
                        { key: "general", label: "Ghi chú chung" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setScopeFilter(option.key)}
                        className={cn(
                          "focus-ring flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs font-medium",
                          scopeFilter === option.key
                            ? "bg-emerald-50 font-semibold text-primary"
                            : "text-heading hover:bg-slate-50",
                        )}
                      >
                        <span>{option.label}</span>
                        {scopeFilter === option.key ? (
                          <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="notes-filter-search"
                    className="block text-[11px] font-semibold text-muted"
                  >
                    Từ khóa
                  </label>
                  <input
                    id="notes-filter-search"
                    type="search"
                    value={noteQuery}
                    onChange={(event) => setNoteQuery(event.target.value)}
                    placeholder="Tìm theo tiêu đề hoặc nội dung..."
                    className="focus-ring mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScopeFilter("all");
                      setNoteQuery("");
                    }}
                    className="focus-ring rounded px-2 py-1 text-xs font-medium text-muted hover:text-heading"
                  >
                    Đặt lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMenuOpen(false)}
                    className="focus-ring rounded-md bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary-dark"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setShowEditor(true)}
            className="focus-ring flex h-9 items-center gap-2 rounded-md bg-[#079367] px-3 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm ghi chú
          </button>
        </div>
      </div>
      {(showEditor || editingId) && (
        <section className="rounded-xl border border-[#e5ede9] bg-white p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-primary">GHI CHÚ CỦA TÔI</p>
              <h2 className="mt-1 text-lg font-semibold">Điều bạn muốn nhớ</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowEditor(false);
                setEditingId(null);
              }}
              aria-label="Đóng biểu mẫu"
              className="focus-ring rounded-md p-2 text-[#667085]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={saveNote} className="mt-5 space-y-3">
            <label className="block text-xs font-medium text-[#47534e]">
              Tiêu đề
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                placeholder="Ví dụ: Những điểm cần nhớ"
                className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#dfe8e3] px-3 text-sm outline-none placeholder:text-[#a0aaa6]"
              />
            </label>
            <label className="block text-xs font-medium text-[#47534e]">
              Nội dung
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={5000}
                rows={5}
                placeholder="Viết ghi chú của bạn..."
                className="focus-ring mt-1.5 w-full resize-y rounded-lg border border-[#dfe8e3] px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-[#a0aaa6]"
              />
            </label>
            {message && (
              <p role="status" className="text-xs text-primary">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="text-xs text-rose-600">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                disabled={saving}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {saving ? "Đang lưu…" : editingId ? "Cập nhật ghi chú" : "Lưu ghi chú"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setTitle("");
                    setBody("");
                    setShowEditor(false);
                  }}
                  className="focus-ring h-10 rounded-lg border border-[#dfe8e3] px-4 text-sm"
                >
                  Hủy
                </button>
              )}
            </div>
          </form>
        </section>
      )}
      <section className="rounded-xl border border-[#e5ede9] bg-white p-5 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Ghi chú gần đây</h2>
          <span className="text-xs text-[#87928d]">{filteredNotes.length}</span>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-[#87928d]">Đang tải ghi chú…</p>
        ) : filteredNotes.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredNotes.map((note) => (
              <li
                key={note.id}
                className="flex min-h-[145px] flex-col rounded-md border border-[#e5e7eb] bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-semibold text-[#222]">{note.title}</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(note.id);
                        setShowEditor(true);
                        setTitle(note.title);
                        setBody(note.content);
                        setMessage("");
                      }}
                      aria-label={`Sửa ghi chú ${note.title}`}
                      className="focus-ring rounded px-1 text-xs text-primary hover:bg-[#effaf5]"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNote(note.id)}
                      aria-label={`Xóa ghi chú ${note.title}`}
                      className="focus-ring rounded px-1 text-xs text-rose-600 hover:bg-rose-50"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
                <p className="mt-2 flex-1 line-clamp-4 whitespace-pre-wrap text-[11px] leading-5 text-[#777]">
                  {note.content}
                </p>
                <time className="mt-3 block border-t border-[#edf0f2] pt-2 text-center text-[10px] text-[#777]">
                  {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
                    new Date(note.updatedAt),
                  )}
                </time>
              </li>
            ))}
          </ul>
        ) : notes.length > 0 ? (
          <div className="mt-4 rounded-lg bg-[#f8fbf9] p-6 text-center">
            <p className="text-sm font-medium text-heading">Không có ghi chú phù hợp bộ lọc</p>
            <p className="mt-1 text-xs text-muted">
              Hãy thử đổi từ khóa hoặc đặt lại bộ lọc phạm vi ghi chú.
            </p>
            <button
              type="button"
              onClick={() => {
                setScopeFilter("all");
                setNoteQuery("");
              }}
              className="focus-ring mt-3 rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-emerald-50"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-[#f8fbf9] p-6 text-center">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium">Chưa có ghi chú</p>
            <p className="mt-1 text-xs leading-5 text-[#87928d]">
              Ghi chú của bạn được đồng bộ qua tài khoản học tập.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
