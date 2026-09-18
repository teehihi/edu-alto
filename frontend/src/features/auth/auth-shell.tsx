"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { cn } from "@/lib/cn";

type AuthShellProps = {
  title: string;
  children: ReactNode;
  panelImage: string;
  panelAlt: string;
  panelSide?: "left" | "right";
  activeAction: "login" | "register";
};

export function AuthShell({ title, children, panelAlt, panelSide = "left" }: AuthShellProps) {
  const isLeft = panelSide === "left";
  return (
    <div className="relative min-h-screen bg-white">
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

      {/* Header bar */}
      <div className="relative z-30 h-[100px]">
        <AppHeader transparent />
      </div>

      {/* Main form container */}
      <main
        className={cn(
          "relative z-20 flex min-h-[calc(100svh-100px)] items-center px-5 py-12 sm:px-8 lg:w-[56.39%] lg:px-10 lg:pb-24 lg:pt-12",
          isLeft ? "lg:ml-auto" : "lg:mr-auto"
        )}
      >
        <div className="mx-auto w-full max-w-[690px]">
          <h1 className="mb-6 text-center text-[28px] font-semibold leading-[1.3] tracking-normal text-primary sm:text-[32px]">{title}</h1>
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
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { name: "Facebook", image: "facebook.png", color: "text-[#0866FF]" },
          { name: "Google", image: "google.svg", color: "text-[#EA4335]" },
          { name: "Apple", image: "apple.png", color: "text-heading" }
        ].map((item) => (
          <button key={item.name} className={cn("focus-ring flex h-[50px] items-center justify-center gap-2 rounded-lg border border-[#B2B5C4] bg-white text-xs transition hover:border-primary hover:bg-primary-soft active:bg-primary-soft sm:text-sm", item.color)} type="button" aria-describedby={provider ? statusId : undefined} onClick={() => setProvider(item.name)}>
            <Image src={`/images/auth/${item.image}`} width={24} height={24} alt="" className="h-6 w-6 object-contain" />
            {item.name}
          </button>
        ))}
      </div>
      {provider ? <p id={statusId} role="status" className="rounded-lg bg-footer p-3 text-sm leading-6 text-muted">Đăng nhập bằng {provider} chưa được hỗ trợ. Bạn có thể tiếp tục bằng email và mật khẩu.</p> : null}
    </div>
  );
}

export function AuthDivider({ label = "Hoặc đăng nhập với" }: { label?: string }) {
  return <div className="flex items-center gap-4 py-2 text-sm text-[#94A3B8]"><span className="h-px flex-1 bg-[#C6D0DE]" /><span>{label}</span><span className="h-px flex-1 bg-[#C6D0DE]" /></div>;
}

export function AuthSubmitLabel({ children }: { children: ReactNode }) {
  return <>{children}<ArrowRight className="h-5 w-5" aria-hidden="true" /></>;
}

type OtpInputProps = { value: string; onChange: (value: string) => void; disabled?: boolean; error?: string };

// One native input preserves paste, autofill, selection and keyboard editing.
// Decorative cells mirror its value without splitting the actual code.
export function OtpInput({ value, onChange, disabled, error }: OtpInputProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(0);
  return (
    <div className="w-full space-y-3">
      <div className={cn("relative mx-auto h-16 w-full max-w-[440px] rounded-lg", disabled && "opacity-60")}>
        <label className="sr-only" htmlFor={id}>Mã OTP</label>
        <input
          id={id} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
          value={value} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
          className="absolute inset-0 h-full w-full cursor-text rounded-lg border-0 bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-not-allowed"
          onChange={(event) => { onChange(event.target.value.replace(/\D/g, "").slice(0, 6)); setCursor(event.target.selectionStart ?? 0); }}
          onPaste={(event) => { event.preventDefault(); onChange(event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)); setCursor(6); }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onSelect={(event) => setCursor(event.currentTarget.selectionStart ?? 0)}
        />
        <div className="pointer-events-none absolute inset-0 grid grid-cols-6 gap-2 sm:gap-4" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className={cn("flex min-w-0 items-center justify-center border-b-2 text-[36px] font-bold transition sm:text-[40px]", value[index] ? "text-primary" : "text-[#B9B9B9]", error ? "border-red-400" : "border-[#DADDE3]", focused && index === Math.min(cursor, 5) && "border-primary bg-primary-soft ring-2 ring-primary/20")}>
              {value[index] || "•"}
            </span>
          ))}
        </div>
      </div>
      {error ? <p id={`${id}-error`} className="text-center text-sm font-medium text-red-600">{error}</p> : null}
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
    <dialog ref={dialog} aria-labelledby="otp-success-title" aria-describedby="otp-success-description" className="m-auto w-[calc(100%-40px)] max-w-[515px] rounded-[36px] border-0 bg-[#F8FFF7] px-5 pb-7 pt-6 text-center shadow-soft backdrop:bg-black/20 sm:rounded-[46px] sm:px-8">
      <Image className="mx-auto h-[185px] w-[190px] object-contain" src="/images/auth/confirmation.png" alt="" width={190} height={185} />
      <h2 id="otp-success-title" className="mt-2 text-[28px] font-bold leading-tight text-primary sm:text-[36px]">Email đã được xác thực</h2>
      <p id="otp-success-description" className="mx-auto mt-3 max-w-[260px] text-sm leading-5 text-[#1A535C]">Bạn sẽ được chuyển đến trang đăng nhập sau {seconds} giây nữa!</p>
      <Link href="/login" className="focus-ring mt-3 inline-block rounded-lg text-sm font-semibold text-primary hover:underline">Đăng nhập ngay</Link>
    </dialog>
  );
}
