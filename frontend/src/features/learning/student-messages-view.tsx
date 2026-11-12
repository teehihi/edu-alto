"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  MessageCircle,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";
import {
  connectRealtimeMessaging,
  fetchUserPresence,
  type RealtimeMessageEvent,
  type RealtimePresenceEvent,
} from "@/lib/realtime-messaging-client";
import {
  fetchStudentConversations,
  fetchStudentMessages,
  sendStudentMessage,
  type StudentConversation,
  type StudentMessage,
} from "@/lib/student-messaging-client";

type SortMode = "newest" | "unread";
type FilterMode = "all" | "unread" | "blocked";

function formatConversationDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short" }).format(
    new Date(value),
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function StudentMessagesView() {
  const { user, getAccessToken } = useAuthSession();
  const [conversations, setConversations] = useState<StudentConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [onlineByUserId, setOnlineByUserId] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [listError, setListError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const page = await fetchStudentConversations(token, 0, 50);
      setConversations(page.data);

      const queryConversationId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("conversationId")
          : null;

      setSelectedId((current) => {
        if (queryConversationId && page.data.some((item) => item.id === queryConversationId)) {
          return queryConversationId;
        }
        if (current && page.data.some((item) => item.id === current)) {
          return current;
        }
        return page.data[0]?.id ?? null;
      });

      if (queryConversationId && page.data.some((item) => item.id === queryConversationId)) {
        setMobileConversationOpen(true);
      }

      const instructorIds = Array.from(new Set(page.data.map((item) => item.instructorId)));
      if (instructorIds.length > 0) {
        try {
          const statuses = await fetchUserPresence(instructorIds, token);
          setOnlineByUserId((prev) => {
            const next = { ...prev };
            for (const status of statuses) {
              next[status.userId] = status.online;
            }
            return next;
          });
        } catch {
          // Presence is best-effort enhancement
        }
      }
    } catch (reason) {
      setListError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không thể tải danh sách tin nhắn lúc này.",
      );
    } finally {
      setLoadingList(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let active = true;
    setLoadingMessages(true);
    setMessageError("");
    void getAccessToken()
      .then(async (token) => {
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        const page = await fetchStudentMessages(selectedId, token, 0, 100);
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
      .catch((reason) => {
        if (active) {
          setMessageError(
            reason instanceof ApiClientError
              ? reason.message
              : reason instanceof Error
                ? reason.message
                : "Không thể tải nội dung cuộc trò chuyện.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingMessages(false);
      });

    return () => {
      active = false;
    };
  }, [getAccessToken, selectedId]);

  useEffect(() => {
    if (!user?.id) return;

    const disconnect = connectRealtimeMessaging({
      getAccessToken,
      onMessage: (event: RealtimeMessageEvent) => {
        if (event.type !== "MESSAGE_CREATED") return;
        const incoming = event.data;
        const isCurrent = selectedIdRef.current === event.conversationId;

        if (isCurrent) {
          setMessages((current) => {
            if (current.some((item) => item.id === incoming.id)) {
              return current;
            }
            return [...current, incoming].sort(
              (first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt),
            );
          });
        }

        setConversations((current) => {
          const exists = current.some((item) => item.id === event.conversationId);
          if (!exists) {
            void loadConversations();
            return current;
          }
          return current.map((item) => {
            if (item.id !== event.conversationId) return item;
            const shouldIncrementUnread = !isCurrent && incoming.senderId !== user.id;
            return {
              ...item,
              lastMessage: incoming.body,
              lastMessageAt: incoming.createdAt,
              unreadCount: isCurrent
                ? 0
                : shouldIncrementUnread
                  ? item.unreadCount + 1
                  : item.unreadCount,
            };
          });
        });
      },
      onPresence: (event: RealtimePresenceEvent) => {
        setOnlineByUserId((current) => ({
          ...current,
          [event.userId]: event.online,
        }));
      },
    });

    return () => {
      disconnect();
    };
  }, [getAccessToken, loadConversations, user?.id]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages, loadingMessages]);

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const visibleConversations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    const filtered = conversations.filter((item) => {
      if (filterMode === "unread" && item.unreadCount <= 0) return false;
      if (filterMode === "blocked" && !item.blocked) return false;
      if (!query) return true;
      return `${item.instructorName} ${item.lastMessage ?? ""}`
        .toLocaleLowerCase("vi")
        .includes(query);
    });

    return [...filtered].sort((first, second) => {
      if (sortMode === "unread" && second.unreadCount !== first.unreadCount) {
        return second.unreadCount - first.unreadCount;
      }
      const firstTime = first.lastMessageAt ? Date.parse(first.lastMessageAt) : 0;
      const secondTime = second.lastMessageAt ? Date.parse(second.lastMessageAt) : 0;
      return secondTime - firstTime;
    });
  }, [conversations, filterMode, search, sortMode]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim() || selected.blocked || sending) return;
    setSending(true);
    setMessageError("");
    const body = draft.trim();
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const created = await sendStudentMessage(selected.id, body, token);
      setMessages((current) =>
        current.some((item) => item.id === created.id) ? current : [...current, created],
      );
      setDraft("");
      setConversations((current) =>
        current.map((item) =>
          item.id === selected.id
            ? { ...item, lastMessage: body, lastMessageAt: created.createdAt }
            : item,
        ),
      );
      inputRef.current?.focus();
    } catch (reason) {
      setMessageError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không thể gửi tin nhắn. Vui lòng thử lại.",
      );
    } finally {
      setSending(false);
    }
  }

  if (loadingList) {
    return (
      <section
        aria-label="Đang tải tin nhắn"
        aria-busy="true"
        className="grid min-h-[560px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs lg:grid-cols-[320px_minmax(0,1fr)]"
      >
        <div className="space-y-3 border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
          <div className="skeleton h-6 w-36 rounded-md" />
          <div className="skeleton h-10 w-full rounded-lg" />
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="hidden flex-col justify-between p-6 lg:flex">
          <div className="skeleton h-12 w-64 rounded-xl" />
          <div className="space-y-3">
            <div className="skeleton h-12 w-2/3 rounded-xl" />
            <div className="skeleton ml-auto h-12 w-1/2 rounded-xl" />
          </div>
          <div className="skeleton h-11 w-full rounded-xl" />
        </div>
      </section>
    );
  }

  if (listError) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs"
      >
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-rose-800">{listError}</p>
        <button
          type="button"
          onClick={() => void loadConversations()}
          className="focus-ring mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Thử tải lại
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-xs">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-primary">
          <MessageCircle className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-heading">Bạn chưa có tin nhắn nào</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Hãy kết nối và đặt câu hỏi trực tiếp cho giảng viên về bài học hoặc lộ trình khóa học của
          bạn.
        </p>
        <Link
          href="/learning/teachers"
          className="focus-ring mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Tìm giảng viên
        </Link>
      </div>
    );
  }

  return (
    <section
      aria-label="Tin nhắn với giảng viên"
      className="grid min-h-[600px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs lg:grid-cols-[340px_minmax(0,1fr)]"
    >
      <aside
        className={cn(
          mobileConversationOpen ? "hidden lg:flex" : "flex",
          "min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r",
        )}
        aria-label="Danh sách cuộc trò chuyện"
      >
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-heading">Tin Nhắn Của Bạn</h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {conversations.length}
            </span>
          </div>

          <label className="relative mt-3 block">
            <span className="sr-only">Tìm kiếm tin nhắn</span>
            <Search
              size={16}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm giảng viên hoặc nội dung..."
              className="focus-ring h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <button
                type="button"
                aria-expanded={sortMenuOpen}
                onClick={() => {
                  setSortMenuOpen((open) => !open);
                  setFilterMenuOpen(false);
                }}
                className="focus-ring inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-primary/40 bg-white px-2.5 font-medium text-heading hover:bg-emerald-50/60"
              >
                <span>Xếp theo: {sortMode === "newest" ? "Mới nhất" : "Chưa đọc"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              </button>
              {sortMenuOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                >
                  {(
                    [
                      { key: "newest", label: "Mới nhất" },
                      { key: "unread", label: "Chưa đọc" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={sortMode === option.key}
                      onClick={() => {
                        setSortMode(option.key);
                        setSortMenuOpen(false);
                      }}
                      className="focus-ring flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-medium text-heading hover:bg-emerald-50"
                    >
                      <span>{option.label}</span>
                      {sortMode === option.key ? (
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
                className="focus-ring inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-primary/40 bg-white px-2.5 font-medium text-heading hover:bg-emerald-50/60"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>
                  Lọc:{" "}
                  {filterMode === "all"
                    ? "Tất cả"
                    : filterMode === "unread"
                      ? "Chưa đọc"
                      : "Đã chặn"}
                </span>
              </button>
              {filterMenuOpen ? (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                >
                  {(
                    [
                      { key: "all", label: "Tất cả" },
                      { key: "unread", label: "Chưa đọc" },
                      { key: "blocked", label: "Đã bị chặn" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={filterMode === option.key}
                      onClick={() => {
                        setFilterMode(option.key);
                        setFilterMenuOpen(false);
                      }}
                      className="focus-ring flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-medium text-heading hover:bg-emerald-50"
                    >
                      <span>{option.label}</span>
                      {filterMode === option.key ? (
                        <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleConversations.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted">Không có cuộc trò chuyện phù hợp bộ lọc.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterMode("all");
                }}
                className="focus-ring mt-2 rounded px-2 py-1 text-xs font-semibold text-primary hover:underline"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            visibleConversations.map((item) => {
              const online = Boolean(onlineByUserId[item.instructorId]);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setMobileConversationOpen(true);
                    setMessageError("");
                  }}
                  aria-current={item.id === selectedId ? "true" : undefined}
                  className={cn(
                    "focus-ring flex min-h-[78px] w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50",
                    item.id === selectedId ? "bg-emerald-50/70" : "bg-white",
                  )}
                >
                  <div className="relative shrink-0">
                    <UserAvatar name={item.instructorName} size="sm" />
                    {online ? (
                      <span
                        title="Đang trực tuyến"
                        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                      />
                    ) : null}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-heading">
                        {item.instructorName}
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {item.lastMessageAt ? (
                          <time className="text-[11px] text-muted">
                            {formatConversationDate(item.lastMessageAt)}
                          </time>
                        ) : null}
                        {item.unreadCount > 0 ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                            {item.unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted">
                      {item.blocked
                        ? "Đã tạm dừng nhận tin nhắn"
                        : item.lastMessage || "Bắt đầu cuộc trò chuyện"}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div
        className={cn(
          mobileConversationOpen ? "flex" : "hidden lg:flex",
          "min-h-[600px] min-w-0 flex-col",
        )}
      >
        {selected ? (
          <>
            <header className="flex min-h-[72px] items-center gap-3 border-b border-slate-200 px-4 sm:px-6">
              <button
                type="button"
                aria-label="Quay lại danh sách tin nhắn"
                onClick={() => setMobileConversationOpen(false)}
                className="focus-ring rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              >
                <ArrowLeft size={19} aria-hidden="true" />
              </button>
              <div className="relative">
                <UserAvatar name={selected.instructorName} size="sm" />
                {onlineByUserId[selected.instructorId] ? (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-heading">
                  {selected.instructorName}
                </h3>
                <p className="text-xs text-muted">
                  {onlineByUserId[selected.instructorId] ? "Đang trực tuyến" : "Giảng viên"}
                </p>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6">
              {loadingMessages ? (
                <div className="space-y-3" aria-label="Đang tải tin nhắn" aria-busy="true">
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className={cn(
                        "h-12 w-2/3 animate-pulse rounded-xl bg-slate-200",
                        item % 2 ? "ml-auto" : "",
                      )}
                    />
                  ))}
                </div>
              ) : null}

              {!loadingMessages && messages.length === 0 ? (
                <div className="m-auto text-center">
                  <p className="font-semibold text-heading">Bắt đầu trò chuyện</p>
                  <p className="mt-1 text-sm text-muted">
                    Gửi lời nhắn đầu tiên để trao đổi cùng {selected.instructorName}.
                  </p>
                </div>
              ) : null}

              {!loadingMessages &&
                messages.map((message) => {
                  const own = message.senderId === selected.studentId;
                  return (
                    <div
                      key={message.id}
                      className={cn("flex", own ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-xl px-4 py-2.5 sm:max-w-[70%]",
                          own
                            ? "rounded-br-sm bg-primary text-white"
                            : "rounded-bl-sm border border-slate-200 bg-white text-slate-800",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {message.body}
                        </p>
                        <time
                          dateTime={message.createdAt}
                          className={cn(
                            "mt-1 block text-right text-[10px]",
                            own ? "text-emerald-50/80" : "text-slate-400",
                          )}
                        >
                          {formatMessageTime(message.createdAt)}
                        </time>
                      </div>
                    </div>
                  );
                })}

              {messageError ? (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {messageError}
                </p>
              ) : null}
              <div ref={messageEndRef} />
            </div>

            <form
              onSubmit={(event) => void handleSend(event)}
              className="border-t border-slate-200 bg-white p-3 sm:p-4"
            >
              {selected.blocked ? (
                <div
                  role="status"
                  className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
                >
                  <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Giảng viên đã tạm dừng nhận tin nhắn từ bạn trong cuộc trò chuyện này.
                  </span>
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <label className="sr-only" htmlFor="student-message-draft">
                  Nhập tin nhắn
                </label>
                <textarea
                  id="student-message-draft"
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
                  placeholder={
                    selected.blocked ? "Không thể gửi tin nhắn lúc này" : "Nhập tin nhắn…"
                  }
                  className="focus-ring max-h-32 min-h-11 flex-1 resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={selected.blocked || sending || !draft.trim()}
                  aria-label="Gửi tin nhắn"
                  className="focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">{sending ? "Đang gửi…" : "Gửi"}</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="m-auto hidden max-w-sm px-8 text-center lg:block">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-primary">
              <MessageCircle size={24} aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-semibold text-heading">Chọn một cuộc trò chuyện</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Tin nhắn trao đổi với giảng viên sẽ hiển thị tại đây.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
