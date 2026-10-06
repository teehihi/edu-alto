"use client";

import { BotAvatar } from "bot-avatars";
import { BorderBeam } from "border-beam";
import { Liquid } from "liquid-gooey";
import Image from "next/image";
import { ArrowUp, BookOpen, ChevronDown, Clock3, MessageCircle, Plus, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const HIDDEN_PATHNAMES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

type ChatMessage = { id: number; role: "user" | "assistant"; text: string };

function ChatbotAvatar({
  size,
  state = "default",
}: {
  size: 40 | 52;
  state?: "default" | "working";
}) {
  const isHeader = size === 52;

  return (
    <BotAvatar
      type="clover"
      size={size}
      face="mouth"
      state={state}
      color="#20B486"
      saturation={1.1}
      theme="light"
      interactive={isHeader}
      paused={!isHeader}
      turn={isHeader ? 1 : 0}
      jumpEvery={isHeader ? 8 : 0}
    />
  );
}

const suggestions = [
  { icon: BookOpen, label: "Tìm khóa học phù hợp" },
  { icon: Clock3, label: "Lập kế hoạch học tập" },
];

export function LearningAssistant() {
  const pathname = usePathname();
  const isAuthPage = Boolean(pathname && HIDDEN_PATHNAMES.has(pathname));
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

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

  function sendMessage(text: string) {
    const question = text.trim();
    if (!question || isWorking) return;
    setMessages((current) => [...current, { id: Date.now(), role: "user", text: question }]);
    setDraft("");
    setIsQuickActionsOpen(false);
    setIsWorking(true);
    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "Mình đã ghi nhận câu hỏi. Trợ lý học tập đang được hoàn thiện để có thể tư vấn dựa trên khóa học và tiến độ của bạn.",
        },
      ]);
      setIsWorking(false);
    }, 700);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
  }

  const sendButton = (
    <button
      type="submit"
      disabled={!draft.trim() || isWorking}
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
    <div className="fixed bottom-5 right-5 z-[60] sm:bottom-7 sm:right-7">
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
              onClick={() => setIsOpen(false)}
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
                onClick={() => {
                  setMessages([]);
                  setIsOptionsOpen(false);
                }}
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
                <ChatbotAvatar size={40} />
              ) : (
                <div className="w-10 shrink-0" aria-hidden="true" />
              )}
              <div className="assistant-message max-w-[84%] rounded-2xl rounded-bl-md border border-[#e8f2ee] bg-[#f5fbf9] px-4 py-3 text-sm leading-6 text-[#344054]">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#20a77b]">
                  Alto chào bạn!
                </span>
                Mình có thể giúp bạn tìm khóa học và lên kế hoạch học tập. Hôm nay bạn muốn học gì?
              </div>
            </div>

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
                      <ChatbotAvatar size={40} />
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
                    {message.text}
                  </div>
                </div>
              );
            })}

            {isWorking && (
              <div className="flex items-end gap-2.5">
                <ChatbotAvatar size={40} state="working" />
                <div
                  className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-[#f5fbf9] px-4 py-4"
                  aria-label="Alto đang nhập"
                >
                  <span className="assistant-typing-dot" />
                  <span className="assistant-typing-dot [animation-delay:120ms]" />
                  <span className="assistant-typing-dot [animation-delay:240ms]" />
                  <span className="sr-only">Alto đang nhập</span>
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
                    className="focus-ring flex items-center gap-2 rounded-xl border border-[#e6efeb] px-3 py-2.5 text-left text-xs font-medium text-[#344054] transition hover:border-[#20b486] hover:bg-[#f5fbf9]"
                  >
                    <Icon size={15} className="text-[#20b486]" />
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div ref={messageEndRef} />
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
                  aria-hidden={Boolean(draft)}
                  tabIndex={draft ? -1 : 0}
                  className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-[#dce7e2] bg-white text-[#20b486] transition hover:bg-[#f5fbf9]"
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
                      className="focus-ring flex h-10 w-max items-center gap-2 rounded-full border border-[#dce7e2] bg-white px-4 text-left text-sm font-medium text-[#344054] shadow-sm transition hover:border-[#20b486] hover:bg-[#f5fbf9]"
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
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setIsQuickActionsOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage(draft);
                    }
                  }}
                  rows={1}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="max-h-24 min-h-9 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 text-sm text-[#101a2c] outline-none placeholder:text-[#98a2b3]"
                />
                {sendButton}
              </form>
            </BorderBeam>
          </div>
          <p className="mt-2 text-center text-[10px] text-[#98a2b3]">
            Trợ lý AI đang trong giai đoạn hoàn thiện
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Đóng trợ lý học tập" : "Mở trợ lý học tập"}
        aria-expanded={isOpen}
        className={`assistant-launcher focus-ring ml-auto flex h-[60px] w-[60px] items-center justify-center rounded-full border-4 border-white bg-[#20b486] text-white shadow-[0_8px_24px_rgba(32,180,134,0.35)] transition hover:scale-105 hover:bg-[#169b70] active:scale-95 ${isOpen ? "rotate-90" : ""}`}
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
