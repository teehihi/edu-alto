"use client";

import { AlertCircle, AlertTriangle, Check, Info, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export type FeedbackTone = "success" | "error" | "info" | "warning";

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string | React.ReactNode;
  tone?: FeedbackTone;
  confirmText?: string;
  onConfirm?: () => void;
  cancelText?: string;
  onCancel?: () => void;
  children?: React.ReactNode;
  autoCloseMs?: number;
}

export function FeedbackModal({
  isOpen,
  onClose,
  title,
  description,
  tone = "success",
  confirmText = "Đã hiểu",
  onConfirm,
  cancelText,
  onCancel,
  children,
  autoCloseMs
}: FeedbackModalProps) {
  const [mounted, setMounted] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto focus confirm button when opened & escape listener
  useEffect(() => {
    if (!isOpen) return;

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus primary button
    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  // Optional auto-close timer
  useEffect(() => {
    if (!isOpen || !autoCloseMs || autoCloseMs <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onClose]);

  if (!isOpen || !mounted) return null;

  const toneConfig = {
    success: {
      badgeBg: "bg-primary text-white",
      haloBg: "bg-emerald-50 text-primary ring-8 ring-emerald-50/80",
      pulseClass: "animate-icon-pulse",
      icon: <Check className="h-7 w-7 stroke-[2.5]" />,
      buttonVariant: "bg-primary hover:bg-primary-dark text-white shadow-xs focus-ring"
    },
    error: {
      badgeBg: "bg-rose-600 text-white",
      haloBg: "bg-rose-50 text-rose-600 ring-8 ring-rose-50/80",
      pulseClass: "",
      icon: <AlertCircle className="h-7 w-7 stroke-[2.5]" />,
      buttonVariant: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-ring"
    },
    warning: {
      badgeBg: "bg-amber-500 text-white",
      haloBg: "bg-amber-50 text-amber-600 ring-8 ring-amber-50/80",
      pulseClass: "",
      icon: <AlertTriangle className="h-7 w-7 stroke-[2.5]" />,
      buttonVariant: "bg-amber-500 hover:bg-amber-600 text-white shadow-xs focus-ring"
    },
    info: {
      badgeBg: "bg-sky-600 text-white",
      haloBg: "bg-sky-50 text-sky-600 ring-8 ring-sky-50/80",
      pulseClass: "",
      icon: <Info className="h-7 w-7 stroke-[2.5]" />,
      buttonVariant: "bg-sky-600 hover:bg-sky-700 text-white shadow-xs focus-ring"
    }
  }[tone];

  function handleConfirmClick() {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  }

  function handleCancelClick() {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  }

  const modalNode = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div
        className={cn(
          "relative z-10 w-full max-w-[420px] transform overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-center shadow-[0_20px_60px_-15px_rgba(16,26,44,0.2),0_10px_25px_-5px_rgba(16,26,44,0.08)] border border-slate-100 animate-modal-content"
        )}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="focus-ring absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Decorative Top Ambient Light */}
        <div
          className={cn(
            "pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full blur-2xl opacity-40",
            tone === "success" && "bg-primary/30",
            tone === "error" && "bg-rose-500/25",
            tone === "warning" && "bg-amber-500/25",
            tone === "info" && "bg-sky-500/25"
          )}
          aria-hidden="true"
        />

        {/* Concentric Icon Badge */}
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300",
              toneConfig.haloBg,
              toneConfig.pulseClass
            )}
          >
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full shadow-xs",
                toneConfig.badgeBg
              )}
            >
              {toneConfig.icon}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3
          id="feedback-modal-title"
          className="text-xl font-bold tracking-tight text-heading"
        >
          {title}
        </h3>

        {/* Description */}
        {description && (
          <div className="mt-2 text-sm leading-relaxed text-muted">
            {typeof description === "string" ? <p>{description}</p> : description}
          </div>
        )}

        {/* Custom Content slot */}
        {children && <div className="mt-4">{children}</div>}

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center">
          {cancelText && (
            <button
              type="button"
              onClick={handleCancelClick}
              className="focus-ring inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-[0.98] sm:w-auto sm:min-w-[120px]"
            >
              {cancelText}
            </button>
          )}

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={handleConfirmClick}
            className={cn(
              "focus-ring inline-flex h-11 w-full items-center justify-center rounded-xl px-6 text-sm font-semibold transition active:scale-[0.98] sm:w-auto sm:min-w-[140px]",
              toneConfig.buttonVariant
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : null;
}
