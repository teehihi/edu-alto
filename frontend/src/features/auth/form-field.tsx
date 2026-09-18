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
    <div className="space-y-2">
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
            "focus-ring min-h-28 w-full resize-y rounded-lg border bg-white px-4 py-3 text-base text-ink transition placeholder:text-[#8A9AB3] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            error ? "border-red-400" : "border-[#D8E1ED] hover:border-primary/60",
            className
          )}
          {...(fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-invalid={Boolean(error)}
          className={cn(
            "focus-ring h-[58px] w-full rounded-lg border bg-white px-4 text-base text-ink transition placeholder:text-[#8A9AB3] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            error ? "border-red-400" : "border-[#D8E1ED] hover:border-primary/60",
            className
          )}
          {...(fieldProps as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error ? (
        <p className="text-sm font-medium text-red-600" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted" id={`${id}-hint`}>
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
  ...props
}: BaseFieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
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
            "focus-ring h-[58px] w-full rounded-lg border bg-white px-4 pr-12 text-base text-ink transition placeholder:text-[#8A9AB3] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            error ? "border-red-400" : "border-[#D8E1ED] hover:border-primary/60"
          )}
          {...props}
        />
        <button
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="focus-ring absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-slate-100 hover:text-heading active:bg-slate-200"
          type="button"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {error ? (
        <p className="text-sm font-medium text-red-600" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AlertMessage({ tone, children }: { tone: "success" | "error" | "info"; children: ReactNode }) {
  const toneClass = {
    success: "border-primary/30 bg-primary-soft text-[#12684f]",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-footer-divider bg-footer text-muted"
  };

  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm font-medium leading-6", toneClass[tone])} role="status">
      {children}
    </div>
  );
}
