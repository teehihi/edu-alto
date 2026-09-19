"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type AuthShellProps = {
  title: string;
  children: ReactNode;
  panelImage?: string;
  panelAlt: string;
  panelSide?: "left" | "right";
  activeAction?: "login" | "register";
};

export function AuthShell({ title, children, panelAlt, panelSide = "left" }: AuthShellProps) {
  const isLeft = panelSide === "left";
  return (
    <div className="relative min-h-screen bg-white lg:h-screen lg:overflow-hidden">
      {/* Side banner image */}
      <aside
        className={cn(
          "absolute inset-y-0 hidden w-[43.61%] overflow-hidden bg-footer lg:block z-0",
          isLeft ? "left-0" : "right-0"
        )}
      >
        <Image
          src={isLeft ? "/images/auth/login-background.png" : "/images/auth/register-background.png"}
          alt={panelAlt}
          fill
          priority
          sizes="45vw"
          className={cn("object-cover", isLeft ? "object-[82.4%_center]" : "object-left")}
        />
      </aside>

      {/* Main form container */}
      <main
        className={cn(
          "relative z-20 flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:h-screen lg:w-[56.39%] lg:overflow-y-auto lg:px-10 lg:py-6 xl:py-8 animate-page",
          isLeft ? "lg:ml-auto" : "lg:mr-auto"
        )}
      >
        <div className="mx-auto w-full max-w-[660px]">
          {/* Logo link back to Home */}
          <div className="mb-2 flex justify-center sm:mb-3">
            <Link
              href="/"
              className="focus-ring inline-block rounded-lg transition-transform hover:scale-105 active:scale-95"
              aria-label="EduAlto - Về trang chủ"
            >
              <Image
                src="/images/logo-with-text.png"
                alt="EduAlto"
                width={220}
                height={66}
                className="h-12 w-auto object-contain sm:h-14 md:h-16"
                priority
              />
            </Link>
          </div>

          <h1 className="mb-4 text-center text-[24px] font-semibold leading-[1.3] tracking-normal text-primary sm:mb-5 sm:text-[28px]">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

export function SocialLoginButtons() {
  const [provider, setProvider] = useState("");
  const statusId = useId();
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { name: "Facebook", image: "facebook.png", color: "text-[#0866FF]" },
          { name: "Google", image: "google.svg", color: "text-[#EA4335]" },
          { name: "Apple", image: "apple.png", color: "text-heading" }
        ].map((item) => (
          <button
            key={item.name}
            className={cn(
              "focus-ring flex h-11 items-center justify-center gap-2 rounded-xl border border-[#B2B5C4] bg-white text-xs font-medium transition hover:border-primary hover:bg-primary-soft active:bg-primary-soft sm:h-12 sm:text-sm",
              item.color
            )}
            type="button"
            aria-describedby={provider ? statusId : undefined}
            onClick={() => setProvider(item.name)}
          >
            <Image src={`/images/auth/${item.image}`} width={22} height={22} alt="" className="h-5 w-5 object-contain sm:h-5.5 sm:w-5.5" />
            {item.name}
          </button>
        ))}
      </div>
      {provider ? (
        <p id={statusId} role="status" className="rounded-xl bg-footer p-2.5 text-xs leading-5 text-muted sm:text-sm">
          Đăng nhập bằng {provider} chưa được hỗ trợ. Bạn có thể tiếp tục bằng email và mật khẩu.
        </p>
      ) : null}
    </div>
  );
}

export function AuthDivider({ label = "Hoặc đăng nhập với" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-xs text-[#94A3B8] sm:text-sm">
      <span className="h-px flex-1 bg-[#C6D0DE]" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-[#C6D0DE]" />
    </div>
  );
}

export function AuthSubmitLabel({ children }: { children: ReactNode }) {
  return <span>{children}</span>;
}

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
};

export function OtpInput({ value, onChange, disabled, error, autoFocus = true }: OtpInputProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  const activeIndex = focused ? Math.min(cursor, Math.min(value.length, 5)) : -1;

  return (
    <div className="w-full space-y-2.5">
      <div className={cn("relative mx-auto h-14 w-full max-w-[420px] sm:h-16", disabled && "opacity-60")}>
        <label className="sr-only" htmlFor={id}>Mã OTP</label>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          autoFocus={autoFocus}
          value={value}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="absolute inset-0 h-full w-full cursor-text rounded-lg border-0 bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-not-allowed"
          onChange={(event) => {
            const nextValue = event.target.value.replace(/\D/g, "").slice(0, 6);
            onChange(nextValue);
            setCursor(event.target.selectionStart ?? nextValue.length);
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            onChange(pasted);
            setCursor(pasted.length);
          }}
          onFocus={() => {
            setFocused(true);
            setCursor(value.length);
          }}
          onBlur={() => setFocused(false)}
          onSelect={(event) => setCursor(event.currentTarget.selectionStart ?? value.length)}
        />
        <div className="pointer-events-none absolute inset-0 grid grid-cols-6 gap-2.5 sm:gap-3.5" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => {
            const isActive = index === activeIndex;
            const hasChar = Boolean(value[index]);

            return (
              <span
                key={index}
                className={cn(
                  "relative flex min-w-0 items-center justify-center border-b-2 text-[28px] font-bold transition-colors duration-150 sm:text-[36px]",
                  hasChar ? "text-primary" : "text-[#CCD2DB]",
                  error
                    ? "border-red-400"
                    : isActive
                    ? "border-primary"
                    : "border-[#DADDE3]"
                )}
              >
                {hasChar ? (
                  value[index]
                ) : isActive ? (
                  <span className="inline-block h-6 w-[2px] animate-caretBlink bg-primary sm:h-7" />
                ) : (
                  "•"
                )}
              </span>
            );
          })}
        </div>
      </div>
      {error ? <p id={`${id}-error`} className="text-center text-xs font-medium text-red-600 sm:text-sm">{error}</p> : null}
    </div>
  );
}

export function OtpSuccessModal({ open, seconds = 3 }: { open: boolean; seconds?: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="otp-success-title"
      aria-describedby="otp-success-description"
      className="m-auto w-[calc(100%-40px)] max-w-[480px] rounded-[32px] border border-emerald-100 bg-[#F8FFF7] px-6 pb-8 pt-7 text-center shadow-card backdrop:bg-black/60 backdrop:backdrop-blur-md animate-page sm:rounded-[40px] sm:px-9"
    >
      <Image className="mx-auto h-[160px] w-[160px] object-contain sm:h-[185px] sm:w-[190px]" src="/images/auth/confirmation.png" alt="" width={190} height={185} />
      <h2 id="otp-success-title" className="mt-2 text-[26px] font-bold leading-tight text-primary sm:text-[32px]">Email đã được xác thực</h2>
      <p id="otp-success-description" className="mx-auto mt-2.5 max-w-[280px] text-xs leading-5 text-[#1A535C] sm:text-sm">Bạn sẽ được chuyển đến trang đăng nhập sau {seconds} giây nữa!</p>
      <Link href="/login" className="focus-ring mt-3.5 inline-block rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-dark sm:text-sm">Đăng nhập ngay</Link>
    </dialog>
  );
}
