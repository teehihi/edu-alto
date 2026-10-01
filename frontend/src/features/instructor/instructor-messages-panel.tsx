"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, MoreHorizontal, Search, Send, ShieldBan, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/features/auth/auth-client";
import { ApiClientError } from "@/lib/api";
import {
  fetchInstructorConversations,
  fetchInstructorMessages,
  hideInstructorConversation,
  sendInstructorMessage,
  setInstructorConversationBlocked,
  type InstructorConversation,
  type InstructorMessage,
} from "@/lib/instructor-messaging-client";

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function InstructorMessagesPanel() {
  const { accessToken, isAuthenticated, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<InstructorConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InstructorMessage[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadConversations = useCallback(async () => {
    if (!accessToken || !isAuthenticated) {
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    setError("");
    try {
      const page = await fetchInstructorConversations(accessToken);
      setConversations(page.data);
      setSelectedId((current) =>
        current && page.data.some((item) => item.id === current)
          ? current
          : (page.data[0]?.id ?? null),
      );
    } catch (loadError) {
      setError(
        loadError instanceof ApiClientError
          ? loadError.message
          : "Không thể tải hộp thư. Vui lòng thử lại.",
      );
    } finally {
      setLoadingList(false);
    }
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!authLoading) void loadConversations();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [authLoading, loadConversations]);

  useEffect(() => {
    if (!accessToken || !selectedId) {
      return;
    }
    let active = true;
    const timeout = window.setTimeout(() => {
      if (!active) return;
      setLoadingMessages(true);
      setMessageError("");
      void fetchInstructorMessages(selectedId, accessToken)
        .then((page) => {
          if (!active) return;
          setMessages(
            [...page.data].sort(
              (first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt),
            ),
          );
          setConversations((current) =>
            current.map((item) => (item.id === selectedId ? { ...item, unreadCount: 0 } : item)),
          );
        })
        .catch((loadError) => {
          if (active)
            setMessageError(
              loadError instanceof ApiClientError ? loadError.message : "Không thể tải tin nhắn.",
            );
        })
        .finally(() => {
          if (active) setLoadingMessages(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [accessToken, selectedId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loadingMessages]);

  const selected = conversations.find((item) => item.id === selectedId) ?? null;
  const visibleConversations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    if (!query) return conversations;
    return conversations.filter((item) =>
      `${item.studentName} ${item.lastMessage ?? ""}`.toLocaleLowerCase("vi").includes(query),
    );
  }, [conversations, search]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !selected || !draft.trim() || selected.blocked) return;
    setSending(true);
    setMessageError("");
    const body = draft.trim();
    try {
      const created = await sendInstructorMessage(selected.id, body, accessToken);
      setMessages((current) => [...current, created]);
      setDraft("");
      setConversations((current) =>
        current.map((item) =>
          item.id === selected.id
            ? { ...item, lastMessage: body, lastMessageAt: created.createdAt }
            : item,
        ),
      );
      inputRef.current?.focus();
    } catch (sendError) {
      setMessageError(
        sendError instanceof ApiClientError
          ? sendError.message
          : "Không thể gửi tin nhắn. Vui lòng thử lại.",
      );
    } finally {
      setSending(false);
    }
  }

  async function toggleBlock() {
    if (!accessToken || !selected) return;
    setActionBusy(true);
    try {
      await setInstructorConversationBlocked(selected.id, !selected.blocked, accessToken);
      setConversations((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, blocked: !item.blocked } : item,
        ),
      );
      setMenuOpen(false);
    } catch (actionError) {
      setMessageError(
        actionError instanceof ApiClientError
          ? actionError.message
          : "Không thể cập nhật trạng thái chặn.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function hideConversation() {
    if (
      !accessToken ||
      !selected ||
      !window.confirm(`Xóa cuộc trò chuyện với ${selected.studentName} khỏi hộp thư?`)
    )
      return;
    setActionBusy(true);
    try {
      await hideInstructorConversation(selected.id, accessToken);
      setConversations((current) => current.filter((item) => item.id !== selected.id));
      setMessages([]);
      setMenuOpen(false);
    } catch (actionError) {
      setMessageError(
        actionError instanceof ApiClientError
          ? actionError.message
          : "Không thể xóa cuộc trò chuyện.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Vui lòng đăng nhập bằng tài khoản giảng viên để xem tin nhắn.
      </div>
    );
  }

  return (
    <section
      aria-label="Hộp thư giảng viên"
      className="grid min-h-[620px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]"
    >
      <aside
        className={`${mobileConversationOpen ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r`}
        aria-label="Danh sách cuộc trò chuyện"
      >
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-base font-semibold text-heading">Hộp thư</h2>
          <label className="relative mt-3 block">
            <span className="sr-only">Tìm cuộc trò chuyện</span>
            <Search
              size={17}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm tin nhắn…"
              className="focus-ring h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="space-y-2 p-3" aria-label="Đang tải hộp thư" aria-busy="true">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-[76px] animate-pulse rounded-md bg-slate-100" />
              ))}
            </div>
          ) : null}
          {!loadingList && error ? (
            <p role="alert" className="p-4 text-sm text-rose-700">
              {error}
              <button
                type="button"
                onClick={() => void loadConversations()}
                className="ml-2 font-semibold underline"
              >
                Thử lại
              </button>
            </p>
          ) : null}
          {!loadingList && !error && visibleConversations.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              {search ? "Không tìm thấy cuộc trò chuyện phù hợp." : "Chưa có tin nhắn từ học viên."}
            </p>
          ) : null}
          {!loadingList &&
            visibleConversations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  setMobileConversationOpen(true);
                  setMessageError("");
                }}
                aria-current={item.id === selectedId ? "true" : undefined}
                className={`focus-ring flex min-h-[78px] w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${item.id === selectedId ? "bg-emerald-50/70" : "bg-white"}`}
              >
                <UserAvatar name={item.studentName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-heading">
                      {item.studentName}
                    </span>
                    {item.unreadCount > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                        {item.unreadCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted">
                    {item.blocked ? "Đã chặn" : item.lastMessage || "Bắt đầu trò chuyện"}
                  </span>
                </span>
              </button>
            ))}
        </div>
      </aside>

      <div
        className={`${mobileConversationOpen ? "flex" : "hidden lg:flex"} min-h-[620px] min-w-0 flex-col`}
      >
        {selected ? (
          <>
            <header className="flex min-h-[72px] items-center gap-3 border-b border-slate-200 px-4 sm:px-6">
              <button
                type="button"
                aria-label="Quay lại hộp thư"
                onClick={() => setMobileConversationOpen(false)}
                className="focus-ring rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              >
                <ArrowLeft size={19} aria-hidden="true" />
              </button>
              <UserAvatar name={selected.studentName} size="sm" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-heading">
                  {selected.studentName}
                </h3>
                <p className="text-xs text-muted">Học viên</p>
              </div>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Tùy chọn cuộc trò chuyện"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                  className="focus-ring rounded-md p-2 text-slate-600 hover:bg-slate-100"
                >
                  <MoreHorizontal size={20} aria-hidden="true" />
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void toggleBlock()}
                      className="focus-ring flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ShieldBan size={15} aria-hidden="true" />
                      {selected.blocked ? "Bỏ chặn học viên" : "Chặn học viên"}
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void hideConversation()}
                      className="focus-ring flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Xóa hội thoại
                    </button>
                  </div>
                ) : null}
              </div>
            </header>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6">
              {loadingMessages ? (
                <div className="space-y-3" aria-label="Đang tải tin nhắn" aria-busy="true">
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className={`h-12 w-2/3 animate-pulse rounded-xl bg-slate-200 ${item % 2 ? "ml-auto" : ""}`}
                    />
                  ))}
                </div>
              ) : null}
              {!loadingMessages && messages.length === 0 ? (
                <div className="m-auto text-center">
                  <p className="font-medium text-heading">Bắt đầu cuộc trò chuyện</p>
                  <p className="mt-1 text-sm text-muted">
                    Gửi tin nhắn để hỗ trợ học viên của bạn.
                  </p>
                </div>
              ) : null}
              {!loadingMessages &&
                messages.map((message) => {
                  const own = message.senderId === selected.instructorId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${own ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-4 py-2.5 sm:max-w-[70%] ${own ? "rounded-br-sm bg-primary text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"}`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {message.body}
                        </p>
                        <time
                          dateTime={message.createdAt}
                          className={`mt-1 block text-right text-[10px] ${own ? "text-emerald-50/80" : "text-slate-400"}`}
                        >
                          {formatMessageTime(message.createdAt)}
                        </time>
                      </div>
                    </div>
                  );
                })}
              {messageError ? (
                <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {messageError}
                </p>
              ) : null}
              <div ref={messageEndRef} />
            </div>
            <form
              onSubmit={(event) => void send(event)}
              className="border-t border-slate-200 bg-white p-3 sm:p-4"
            >
              {selected.blocked ? (
                <p className="pb-3 text-center text-sm text-amber-800">
                  Bạn đã chặn học viên này. Bỏ chặn để gửi tin nhắn.
                </p>
              ) : null}
              <div className="flex items-end gap-2">
                <label className="sr-only" htmlFor="instructor-message-input">
                  Nhập tin nhắn
                </label>
                <textarea
                  id="instructor-message-input"
                  ref={inputRef}
                  rows={1}
                  maxLength={4000}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  disabled={selected.blocked || sending}
                  placeholder="Nhập tin nhắn…"
                  className="focus-ring max-h-32 min-h-11 flex-1 resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={selected.blocked || sending || !draft.trim()}
                  className="focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75] active:bg-[#128763] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">Gửi</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="m-auto hidden max-w-sm px-8 text-center lg:block">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-primary">
              <Send size={24} aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-semibold text-heading">Chọn một cuộc trò chuyện</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Tin nhắn từ học viên sẽ xuất hiện tại đây.
            </p>
          </div>
        )}
        {!selected && !loadingList && !error ? (
          <div className="m-auto px-6 py-10 text-center text-sm text-slate-500 lg:hidden">
            Chưa có cuộc trò chuyện để hiển thị.
          </div>
        ) : null}
      </div>
    </section>
  );
}
