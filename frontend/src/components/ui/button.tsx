import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "border-primary bg-primary text-white shadow-xs hover:bg-primary-dark active:bg-primary-dark",
  secondary: "border-primary-soft bg-primary-soft text-primary hover:bg-[#d9fff3] active:bg-[#c8f7ec]",
  outline: "border-slate-300 bg-white text-ink hover:bg-slate-50 active:bg-slate-100",
  ghost: "border-transparent bg-transparent text-ink hover:bg-slate-100 active:bg-slate-200"
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-[60px] px-7 text-lg"
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
