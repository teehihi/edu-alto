"use client";

import { BotAvatar } from "bot-avatars";
import { BorderBeam } from "border-beam";
import { Liquid } from "liquid-gooey";
import Image from "next/image";
import { ArrowUp, BookOpen, ChevronDown, Clock3, MessageCircle, Plus, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { type FormEvent, type Ref, useEffect, useMemo, useRef, useState } from "react";
import { ApiClientError } from "@/lib/api";
import { assistantApi } from "@/lib/assistant-client";
import { useAuthSession } from "@/lib/auth-session";
import type { AssistantChatRequest, AssistantSource } from "@/types/assistant";

const HIDDEN_PATHNAMES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 12;
const MAX_STORED_MESSAGES = 100;
const CHAT_HISTORY_STORAGE_PREFIX = "edualto:assistant-chat:v1:";
const COURSE_PATH_PATTERN =
  /^\/(?:instructor\/courses|learning\/courses)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  sources?: AssistantSource[];
};

function readStoredMessages(storageKey: string): ChatMessage[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is ChatMessage => {
        if (typeof item !== "object" || item === null) return false;
        const message = item as Partial<ChatMessage>;
        return (
          typeof message.id === "number" &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.text === "string"
        );
      })
      .slice(-MAX_STORED_MESSAGES)
      .map((message) => ({
        id: message.id,
        role: message.role,
        text: message.text.slice(0, 8000),
        ...(Array.isArray(message.sources)
          ? {
              sources: message.sources.filter(
                (source) =>
                  typeof source?.id === "string" &&
                  typeof source.title === "string" &&
                  typeof source.url === "string",
              ),
            }
          : {}),
      }));
  } catch {
    return [];
  }
}

function ChatbotAvatar({
  size,
  state = "default",
  avatarRef,
}: {
  size: 40 | 52;
  state?: "default" | "working";
  avatarRef?: Ref<HTMLCanvasElement>;
}) {
  return (
    <BotAvatar
      type="clover"
      size={size}
      face="mouth"
      state={state}
      color="#20B486"
      saturation={1.1}
      theme="light"
      interactive
      turn={1}
      jumpEvery={8}
      ref={avatarRef}
    />
  );
}

function getCaretPosition(textarea: HTMLTextAreaElement) {
  const bounds = textarea.getBoundingClientRect();
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  mirror.style.cssText = [
    "position: fixed",
    "visibility: hidden",
    "white-space: pre-wrap",
    "overflow-wrap: break-word",
    `left: ${bounds.left}px`,
    `top: ${bounds.top - textarea.scrollTop}px`,
    `width: ${bounds.width}px`,
    `box-sizing: ${computed.boxSizing}`,
    `font: ${computed.font}`,
    `line-height: ${computed.lineHeight}`,
    `letter-spacing: ${computed.letterSpacing}`,
    `text-align: ${computed.textAlign}`,
    `text-indent: ${computed.textIndent}`,
    `padding: ${computed.padding}`,
    `border: ${computed.border}`,
    `tab-size: ${computed.tabSize}`,
    `word-break: ${computed.wordBreak}`,
  ].join(";");

  const caretIndex = textarea.selectionStart ?? textarea.value.length;
  mirror.append(document.createTextNode(textarea.value.slice(0, caretIndex)));
  const marker = document.createElement("span");
  marker.textContent = textarea.value.slice(caretIndex, caretIndex + 1) || "\u200b";
  mirror.append(marker);
  document.body.append(mirror);
  const caretBounds = marker.getBoundingClientRect();
  mirror.remove();

  return { x: caretBounds.left, y: caretBounds.top };
}

const suggestions = [
  { icon: BookOpen, label: "Tìm khóa học phù hợp" },
  { icon: Clock3, label: "EduAlto hỗ trợ học tập như thế nào?" },
];

export function LearningAssistant() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: isAuthLoading, getAccessToken } = useAuthSession();
  const isAuthPage = Boolean(pathname && HIDDEN_PATHNAMES.has(pathname));
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryRequest, setRetryRequest] = useState<AssistantChatRequest | null>(null);
  const chatHistoryStorageKey = `${CHAT_HISTORY_STORAGE_PREFIX}${isAuthenticated ? (user?.id ?? "account") : "visitor"}`;
  const [loadedChatHistoryKey, setLoadedChatHistoryKey] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const messageIdRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const avatarCanvasRef = useRef<HTMLCanvasElement>(null);
  const caretFrameRef = useRef<number | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const canChat = !isAuthLoading;

  function pointAvatarAtCaret() {
    if (caretFrameRef.current !== null) {
      cancelAnimationFrame(caretFrameRef.current);
    }

    caretFrameRef.current = requestAnimationFrame(() => {
      caretFrameRef.current = null;
      const textarea = inputRef.current;
      const avatar = avatarCanvasRef.current;
      if (!textarea || !avatar || document.activeElement !== textarea) return;

      const caret = getCaretPosition(textarea);
      const avatarBounds = avatar.getBoundingClientRect();
      if (!avatarBounds.width) return;

      const centerX = avatarBounds.left + avatarBounds.width / 2;
      const centerY = avatarBounds.top + avatarBounds.height / 2;
      const directionX = caret.x - centerX;
      const directionY = caret.y - centerY;
      const distance = Math.hypot(directionX, directionY) || 1;
      const pointerDistance = avatarBounds.width * 1.5;

      // The avatar follows nearby pointer events; project the caret direction nearby so its gaze stays in range.
      document.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientX: centerX + (directionX / distance) * pointerDistance,
          clientY: centerY + (directionY / distance) * pointerDistance,
          pointerId: 1,
          pointerType: "mouse",
        }),
      );
    });
  }

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceFromBottom > 80);
  }

  function scrollToBottom() {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    setShowScrollBottom(false);
  }

  const lastAssistantMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return messages[i].id;
      }
    }
    return null;
  }, [messages]);

  const showWelcomeAvatar = !isWorking && lastAssistantMessageId === null;

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isWorking]);

  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      setShowScrollBottom(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
      if (caretFrameRef.current !== null) {
        cancelAnimationFrame(caretFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    requestRef.current?.abort();
    requestRef.current = null;
    const storedMessages = readStoredMessages(chatHistoryStorageKey);
    messagesRef.current = storedMessages;
    messageIdRef.current = storedMessages.reduce(
      (highest, message) => Math.max(highest, message.id),
      0,
    );
    setMessages(storedMessages);
    setError(null);
    setRetryRequest(null);
    setIsWorking(false);
    setDraft("");
    setLoadedChatHistoryKey(chatHistoryStorageKey);
  }, [chatHistoryStorageKey, isAuthLoading]);

  useEffect(() => {
    if (isAuthLoading || loadedChatHistoryKey !== chatHistoryStorageKey) return;
    try {
      if (messages.length === 0) {
        window.localStorage.removeItem(chatHistoryStorageKey);
      } else {
        window.localStorage.setItem(
          chatHistoryStorageKey,
          JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)),
        );
      }
    } catch {
      // Chat history is best-effort when browser storage is unavailable or full.
    }
  }, [chatHistoryStorageKey, isAuthLoading, loadedChatHistoryKey, messages]);

  function clearChat() {
    requestRef.current?.abort();
    requestRef.current = null;
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    setRetryRequest(null);
    setIsWorking(false);
    setIsOptionsOpen(false);
    setIsQuickActionsOpen(false);
    setDraft("");
    try {
      window.localStorage.removeItem(chatHistoryStorageKey);
    } catch {
      // Keep the visible chat clear even when browser storage is unavailable.
    }
  }

  function closeChat() {
    if (requestRef.current) {
      requestRef.current.abort();
      requestRef.current = null;
      setIsWorking(false);
      setError("Đã dừng phản hồi. Bạn có thể thử lại khi mở cuộc trò chuyện.");
    }
    setIsOptionsOpen(false);
    setIsQuickActionsOpen(false);
    setIsOpen(false);
  }

  async function requestAnswer(request: AssistantChatRequest) {
    if (!canChat || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setError(null);
    setRetryRequest(request);
    setIsWorking(true);
    try {
      const accessToken = isAuthenticated ? await getAccessToken() : null;
      if (requestRef.current !== controller || controller.signal.aborted) return;
      if (isAuthenticated && !accessToken) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để trò chuyện với Alto.");
        return;
      }
      const response = await assistantApi.chat(request, accessToken, controller.signal);
      if (requestRef.current !== controller || controller.signal.aborted) return;
      messagesRef.current = [
        ...messagesRef.current,
        {
          id: ++messageIdRef.current,
          role: "assistant",
          text: response.answer,
          sources: response.sources,
        },
      ];
      setMessages(messagesRef.current);
      setRetryRequest(null);
    } catch (cause) {
      if (requestRef.current !== controller || controller.signal.aborted) return;
      setError(
        cause instanceof ApiClientError && cause.status === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : cause instanceof ApiClientError
            ? cause.message
            : "Alto chưa thể trả lời lúc này. Vui lòng thử lại.",
      );
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsWorking(false);
      }
    }
  }

  function sendMessage(text: string) {
    const question = text.trim();
    if (!question || !canChat || isWorking || requestRef.current) return;
    if (question.length > MAX_MESSAGE_LENGTH) {
      setError("Mỗi câu hỏi tối đa 2.000 ký tự. Hãy chia thành các câu hỏi ngắn hơn.");
      return;
    }
    const courseId = pathname?.match(COURSE_PATH_PATTERN)?.[1];
    const request: AssistantChatRequest = {
      message: question,
      history: messagesRef.current.slice(-MAX_HISTORY_LENGTH).map(({ role, text: content }) => ({
        role,
        text: content.slice(0, MAX_MESSAGE_LENGTH),
      })),
      ...(courseId ? { courseId } : {}),
    };
    messagesRef.current = [
      ...messagesRef.current,
      { id: ++messageIdRef.current, role: "user", text: question },
    ];
    setMessages(messagesRef.current);
    setDraft("");
    setIsQuickActionsOpen(false);
    void requestAnswer(request);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
  }

  const sendButton = (
    <button
      type="submit"
      disabled={!draft.trim() || isWorking || !canChat}
      aria-label="Gửi tin nhắn"
      className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#20b486] text-white transition hover:bg-[#169b70] active:scale-95 disabled:cursor-not-allowed disabled:bg-[#c5d8d1]"
    >
      <ArrowUp size={18} />
    </button>
  );

  if (isAuthPage) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] sm:bottom-7 sm:right-7">
      <section
        aria-label="Trợ lý học tập EduAlto"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`assistant-panel relative mb-4 flex h-[min(540px,calc(100dvh-112px))] w-[min(368px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_20px_60px_rgba(16,26,44,0.18)] transition-opacity duration-150 ease-out ${
          isOpen
            ? "opacity-100 pointer-events-auto visible"
            : "pointer-events-none opacity-0 invisible"
        }`}
      >
        <header className="relative flex h-[92px] shrink-0 items-center justify-between bg-white px-[15px]">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-[#e4f7f0]">
              <ChatbotAvatar size={52} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-semibold leading-[1.6] text-[#0f172a]">
                Alto Bot
              </h2>
              <p className="truncate text-[13px] leading-5 text-[#64748b]">Trợ lý học tập</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-[#0f172a]">
            <button
              type="button"
              onClick={() => setIsOptionsOpen((open) => !open)}
              aria-label="Tùy chọn trò chuyện"
              aria-expanded={isOptionsOpen}
              className="focus-ring rounded-md p-1 transition hover:bg-slate-100"
            >
              <Image src="/images/chatbot/more.svg" alt="" width={24} height={24} />
            </button>
            <button
              type="button"
              onClick={closeChat}
              aria-label="Đóng cửa sổ trò chuyện"
              className="focus-ring rounded-md p-1 transition hover:bg-slate-100"
            >
              <Image src="/images/chatbot/close.svg" alt="" width={24} height={24} />
            </button>
          </div>
          <Image
            src="/images/chatbot/header-divider.svg"
            alt=""
            width={950}
            height={1}
            className="pointer-events-none absolute left-[-1px] top-[91px] z-10 max-w-none"
          />
          {isOptionsOpen && (
            <div className="absolute right-[52px] top-[68px] z-20 min-w-40 rounded-lg border border-[#e2e8f0] bg-white p-1 shadow-lg">
              <button
                type="button"
                onClick={clearChat}
                className="focus-ring w-full rounded-md px-3 py-2 text-left text-sm text-[#334155] transition hover:bg-slate-50"
              >
                Xóa đoạn chat
              </button>
            </div>
          )}
        </header>

        <div className="relative flex-1 min-h-0">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="absolute inset-0 space-y-4 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_rgba(32,180,134,0.05),_transparent_62%)] px-4 py-5"
            aria-live="polite"
          >
            <div className="flex items-end gap-2.5">
              {showWelcomeAvatar ? (
                <ChatbotAvatar size={40} avatarRef={avatarCanvasRef} />
              ) : (
                <div className="w-10 shrink-0" aria-hidden="true" />
              )}
              <div className="assistant-message max-w-[84%] rounded-2xl rounded-bl-md border border-[#e8f2ee] bg-[#f5fbf9] px-4 py-3 text-sm leading-6 text-[#344054]">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#20a77b]">
                  Alto chào bạn!
                </span>
                {isAuthenticated
                  ? "Mình có thể giải đáp từ nội dung khóa học bạn được truy cập. Bạn muốn tìm hiểu điều gì?"
                  : "Mình có thể giới thiệu EduAlto, cách đăng ký và các chức năng của hệ thống. Bạn cần tìm hiểu điều gì?"}
              </div>
            </div>

            <p className="ml-10 text-[11px] leading-4 text-[#667085]">
              Câu hỏi và ngữ cảnh khóa học được gửi tới Gemini. Bản thử nghiệm dùng hạn mức miễn
              phí; hãy tránh gửi thông tin cá nhân hoặc dữ liệu nhạy cảm.
            </p>

            {!isAuthenticated && !isAuthLoading && (
              <div className="ml-10 rounded-lg border border-[#dce7e2] bg-white px-3 py-2 text-xs leading-5 text-[#344054]">
                <>
                  Bạn có thể hỏi thông tin tổng quan ngay. Hãy{" "}
                  <a
                    href={`/login?next=${encodeURIComponent(pathname || "/")}`}
                    className="focus-ring rounded-sm font-semibold text-[#169b70] underline underline-offset-2 hover:text-[#107956]"
                  >
                    đăng nhập
                  </a>{" "}
                  để hỏi về nội dung học tập của bạn.
                </>
              </div>
            )}

            {messages.map((message) => {
              const isLatestAssistant =
                !isWorking && message.role === "assistant" && message.id === lastAssistantMessageId;

              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "items-end gap-2.5"}`}
                >
                  {message.role === "assistant" &&
                    (isLatestAssistant ? (
                      <ChatbotAvatar size={40} avatarRef={avatarCanvasRef} />
                    ) : (
                      <div className="w-10 shrink-0" aria-hidden="true" />
                    ))}
                  <div
                    className={`assistant-message max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "rounded-br-md bg-[#20b486] text-white"
                        : "rounded-bl-md bg-[#f5fbf9] text-[#344054]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    {message.role === "assistant" && Boolean(message.sources?.length) && (
                      <div className="mt-3 border-t border-[#dce7e2] pt-2">
                        <p className="mb-1 text-[11px] font-semibold text-[#667085]">
                          Nguồn tham khảo
                        </p>
                        <ul className="space-y-1">
                          {message.sources?.map((source) => (
                            <li key={`${source.id}-${source.url}`}>
                              <a
                                href={source.url}
                                className="focus-ring rounded-sm text-xs font-medium text-[#169b70] underline underline-offset-2 transition hover:text-[#107956]"
                              >
                                {source.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isWorking && (
              <div className="flex items-end gap-2.5">
                <ChatbotAvatar size={40} state="working" />
                <div
                  className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-[#f5fbf9] px-4 py-4"
                  aria-label="Alto đang tìm nội dung và soạn câu trả lời"
                >
                  <span className="assistant-typing-dot" />
                  <span className="assistant-typing-dot [animation-delay:120ms]" />
                  <span className="assistant-typing-dot [animation-delay:240ms]" />
                  <span className="sr-only">Alto đang tìm nội dung và soạn câu trả lời</span>
                </div>
              </div>
            )}

            {messages.length === 0 && (
              <div className="ml-10 grid gap-2">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#98a2b3]">
                  Gợi ý cho bạn
                </p>
                {suggestions.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => sendMessage(label)}
                    disabled={!canChat || isWorking}
                    className="focus-ring flex items-center gap-2 rounded-xl border border-[#e6efeb] px-3 py-2.5 text-left text-xs font-medium text-[#344054] transition hover:border-[#20b486] hover:bg-[#f5fbf9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon size={15} className="text-[#20b486]" />
                    {label}
                  </button>
                ))}
              </div>
            )}
            {error && (
              <div
                className="ml-10 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"
                role="alert"
              >
                <p>{error}</p>
                {retryRequest && canChat && !isWorking && (
                  <button
                    type="button"
                    onClick={() => void requestAnswer(retryRequest)}
                    className="focus-ring mt-1 rounded-md px-2 py-1 font-semibold underline underline-offset-2 transition hover:bg-red-100 active:scale-95"
                  >
                    Thử lại câu hỏi vừa gửi
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Scroll to bottom button */}
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="Cuộn xuống tin nhắn mới nhất"
            title="Cuộn xuống tin nhắn mới nhất"
            aria-hidden={!showScrollBottom}
            tabIndex={showScrollBottom ? 0 : -1}
            className={`focus-ring absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[#dce7e2] bg-white text-slate-600 shadow-[0_4px_12px_rgba(16,26,44,0.12)] transition-all duration-200 hover:border-[#20b486] hover:text-[#20b486] hover:shadow-[0_6px_16px_rgba(32,180,134,0.2)] active:scale-95 ${
              showScrollBottom
                ? "translate-y-0 opacity-100 pointer-events-auto"
                : "translate-y-2 opacity-0 pointer-events-none"
            }`}
          >
            <ChevronDown size={17} className="stroke-[2.2]" />
          </button>
        </div>

        <div className="relative border-t border-[#edf2f0] px-4 pb-3 pt-3">
          <div
            className={`flex items-center transition-[gap] duration-200 ${draft ? "gap-0" : "gap-2"}`}
          >
            <Liquid
              blur={8}
              contrast={18}
              fill="#ffffff"
              shadow="0 2px 8px rgba(16, 26, 44, 0.08)"
              filterPadding={112}
              className={`relative h-10 shrink-0 overflow-visible transition-[width,opacity] duration-200 ${draft ? "w-0 opacity-0" : "w-10 opacity-100"}`}
            >
              <Liquid.Item
                scale={isQuickActionsOpen && !draft ? 0.92 : 1}
                transition="bouncy"
                className="absolute bottom-0 left-0 z-10"
              >
                <button
                  type="button"
                  onClick={() => setIsQuickActionsOpen((open) => !open)}
                  aria-label={isQuickActionsOpen ? "Đóng gợi ý học tập" : "Mở gợi ý học tập"}
                  aria-expanded={isQuickActionsOpen}
                  disabled={!canChat || isWorking}
                  aria-hidden={Boolean(draft)}
                  tabIndex={draft ? -1 : 0}
                  className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-[#dce7e2] bg-white text-[#20b486] transition hover:bg-[#f5fbf9] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isQuickActionsOpen ? <X size={19} /> : <Plus size={20} />}
                </button>
              </Liquid.Item>
              {suggestions.map(({ icon: Icon, label }, index) => {
                const isVisible = isQuickActionsOpen && !draft;
                return (
                  <Liquid.Item
                    key={label}
                    y={isVisible ? -(52 * (index + 1)) : 0}
                    scale={isVisible ? 1 : 0.1}
                    transition="bouncy"
                    delay={index * 45}
                    className={`absolute bottom-0 left-0 z-20 transition-opacity duration-150 ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
                  >
                    <button
                      type="button"
                      onClick={() => sendMessage(label)}
                      aria-hidden={!isVisible}
                      tabIndex={isVisible ? 0 : -1}
                      disabled={!canChat || isWorking}
                      className="focus-ring flex h-10 w-max items-center gap-2 rounded-full border border-[#dce7e2] bg-white px-4 text-left text-sm font-medium text-[#344054] shadow-sm transition hover:border-[#20b486] hover:bg-[#f5fbf9] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon size={16} className="text-[#20b486]" />
                      {label}
                    </button>
                  </Liquid.Item>
                );
              })}
            </Liquid>
            <BorderBeam
              size="sm"
              colorVariant="colorful"
              strength={0.82}
              active={isOpen}
              theme="light"
              borderRadius={12}
              duration={2.8}
              glowSize={1.25}
              css={`
                [data-beam="{id}"][data-active]::after {
                  opacity: calc(
                    var(--beam-opacity-{id}) * 0.68 * var(--beam-strength, 1)
                  ) !important;
                }

                @media (prefers-reduced-motion: reduce) {
                  [data-beam="{id}"][data-active] {
                    animation: none !important;
                  }

                  [data-beam="{id}"][data-active]::after {
                    animation: none !important;
                    opacity: 0.55 !important;
                  }
                }
              `}
              className="min-w-0 flex-1"
            >
              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-2 rounded-xl border border-[#dce7e2] bg-white p-2 focus-within:ring-1 focus-within:ring-[#20b486]/20"
              >
                <label className="sr-only" htmlFor="assistant-message">
                  Nhập câu hỏi của bạn
                </label>
                <textarea
                  id="assistant-message"
                  ref={inputRef}
                  value={draft}
                  onFocus={pointAvatarAtCaret}
                  onSelect={pointAvatarAtCaret}
                  onKeyUp={pointAvatarAtCaret}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setIsQuickActionsOpen(false);
                    pointAvatarAtCaret();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage(draft);
                    }
                  }}
                  rows={1}
                  maxLength={MAX_MESSAGE_LENGTH}
                  disabled={!canChat || isWorking}
                  placeholder={canChat ? "Nhập câu hỏi của bạn..." : "Đang kiểm tra phiên..."}
                  className="max-h-24 min-h-9 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 text-sm text-[#101a2c] outline-none placeholder:text-[#98a2b3] disabled:cursor-not-allowed disabled:opacity-60"
                />
                {sendButton}
              </form>
            </BorderBeam>
          </div>
          <p className="mt-2 text-center text-[10px] text-[#98a2b3]">
            Alto có thể trả lời chưa chính xác. Hãy kiểm tra nguồn nội dung.
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={() => (isOpen ? closeChat() : setIsOpen(true))}
        aria-label={isOpen ? "Đóng trợ lý học tập" : "Mở trợ lý học tập"}
        aria-expanded={isOpen}
        className={`assistant-launcher focus-ring pointer-events-auto ml-auto flex h-[60px] w-[60px] items-center justify-center rounded-full border-4 border-white bg-[#20b486] text-white shadow-[0_8px_24px_rgba(32,180,134,0.35)] transition hover:scale-105 hover:bg-[#169b70] active:scale-95 ${isOpen ? "rotate-90" : ""}`}
      >
        {isOpen ? (
          <X size={22} />
        ) : (
          <span className="relative flex items-center justify-center">
            <BotAvatar
              type="clover"
              size={48}
              color="#c8f4e4"
              ink="#075b43"
              face="mouth"
              state="default"
              theme="dark"
              interactive
            />
            <MessageCircle
              className="absolute -bottom-1 -right-1 rounded-full border-2 border-[#20b486] bg-white p-0.5 text-[#169b70]"
              size={19}
            />
          </span>
        )}
        <span className="sr-only">Alto</span>
      </button>
    </div>
  );
}
