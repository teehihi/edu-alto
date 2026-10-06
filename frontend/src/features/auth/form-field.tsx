"use client";

import { Eye, EyeOff } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";

type BaseFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  action?: ReactNode;
};

type TextFieldProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    multiline?: false;
  };

type TextAreaFieldProps = BaseFieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true;
  };

export function FormField(props: TextFieldProps | TextAreaFieldProps) {
  const { id, label, error, hint, action, className, multiline, ...fieldProps } = props;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-heading" htmlFor={id}>
          {label}
        </label>
        {action}
      </div>
      {multiline ? (
        <textarea
          id={id}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-invalid={Boolean(error)}
          className={cn(
            "min-h-24 w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition duration-150 placeholder:text-[#8A9AB3] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:text-base",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-[#D8E1ED] hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary",
            className,
          )}
          {...(fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-invalid={Boolean(error)}
          className={cn(
            "h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-ink outline-none transition duration-150 placeholder:text-[#8A9AB3] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:h-12 sm:text-base",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-[#D8E1ED] hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary",
            className,
          )}
          {...(fieldProps as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error ? (
        <p className="text-xs font-medium text-red-600 sm:text-sm" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted sm:text-sm" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({
  id,
  label,
  error,
  hint,
  className,
  ...props
}: BaseFieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-heading" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-invalid={Boolean(error)}
          className={cn(
            "h-11 w-full rounded-lg border bg-white px-3.5 pr-11 text-sm text-ink outline-none transition duration-150 placeholder:text-[#8A9AB3] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:h-12 sm:text-base",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-[#D8E1ED] hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary",
            className,
          )}
          {...props}
        />
        <button
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          type="button"
          tabIndex={-1}
          disabled={props.disabled}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1.5 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-40 sm:right-2 sm:h-9 sm:w-9"
        >
          {visible ? (
            <EyeOff className="h-4.5 w-4.5" aria-hidden="true" />
          ) : (
            <Eye className="h-4.5 w-4.5" aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? (
        <p className="text-xs font-medium text-red-600 sm:text-sm" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted sm:text-sm" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AlertMessage({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: ReactNode;
}) {
  const toneClass = {
    success: "border-primary/30 bg-primary-soft text-[#12684f]",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-footer-divider bg-footer text-muted",
  };

  return (
    <div
      className={cn("rounded-lg border px-4 py-3 text-sm font-medium leading-6", toneClass[tone])}
      role="status"
    >
      {children}
    </div>
  );
}
