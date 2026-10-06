"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField, PasswordField } from "@/features/auth/form-field";
import {
  extractFieldErrors,
  getFriendlyError,
  hasLetterAndDigit,
  isEmail,
  isOtp,
  sanitizeOtp,
  type FieldErrors,
} from "@/features/auth/form-utils";
import { cn } from "@/lib/cn";
import { forgotPassword, resetPassword, verifyResetOtp } from "./auth-client";
import { AuthShell, OtpInput } from "./auth-shell";

type Step = "email" | "otp" | "password" | "success";
type ForgotFields = "email" | "otp" | "password" | "confirmPassword";

export function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email")?.trim() ?? "";
  const initialSent = searchParams.get("sent") === "1" || searchParams.get("step") === "otp";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<Step>(initialEmail && initialSent ? "otp" : "email");
  const [cooldown, setCooldown] = useState(initialSent ? 60 : 0);
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<ForgotFields>>({});
  const [status, setStatus] = useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(() =>
    initialSent
      ? {
          tone: "info",
          message: "Mã xác minh đặt lại mật khẩu đã được gửi đến email của bạn.",
        }
      : null,
  );

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(
      () => setCooldown((current) => Math.max(current - 1, 0)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function clearError(field: ForgotFields) {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  // --- Bước 1: Gửi mã OTP tới Email ---
  async function handleSendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const trimmedEmail = email.trim();
    if (!isEmail(trimmedEmail)) {
      setErrors({ email: "Vui lòng nhập email hợp lệ." });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await forgotPassword({ email: trimmedEmail });
      setStep("otp");
      setCooldown(60);
      setStatus({
        tone: "info",
        message: "Mã xác minh gồm 6 chữ số đã được gửi đến email của bạn.",
      });
    } catch (error) {
      const fieldErrors = extractFieldErrors<ForgotFields>(error);
      if (fieldErrors) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      setStatus({
        tone: "error",
        message: getFriendlyError(
          error,
          "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.",
        ),
      });
    } finally {
      setSubmitting(false);
    }
  }

  // --- Bước 2: Xác thực mã OTP ---
  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const nextErrors: FieldErrors<ForgotFields> = {};
    if (!isEmail(email)) {
      nextErrors.email = "Vui lòng nhập email hợp lệ.";
    }
    if (!isOtp(otp)) {
      nextErrors.otp = "Mã xác minh gồm 6 chữ số.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await verifyResetOtp({ email: email.trim(), otp });
      setStep("password");
      setErrors({});
      setStatus({
        tone: "success",
        message: "Xác minh mã thành công! Vui lòng tạo mật khẩu mới cho tài khoản.",
      });
    } catch (error) {
      const fieldErrors = extractFieldErrors<ForgotFields>(error);
      if (fieldErrors) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      setStatus({
        tone: "error",
        message: getFriendlyError(error, "Mã đặt lại mật khẩu chưa đúng hoặc đã hết hạn."),
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Gửi lại mã OTP
  async function handleResendOtp() {
    if (cooldown > 0 || resending || submitting) return;
    setStatus(null);

    const trimmedEmail = email.trim();
    if (!isEmail(trimmedEmail)) {
      setErrors((prev) => ({ ...prev, email: "Vui lòng nhập email hợp lệ." }));
      return;
    }

    setResending(true);
    try {
      await forgotPassword({ email: trimmedEmail });
      setCooldown(60);
      setOtp("");
      setErrors({});
      setStatus({ tone: "info", message: "Mã xác minh mới đã được gửi đến email của bạn." });
    } catch (error) {
      setStatus({
        tone: "error",
        message: getFriendlyError(error, "Không thể gửi lại mã lúc này. Vui lòng thử lại sau."),
      });
    } finally {
      setResending(false);
    }
  }

  // --- Bước 3: Tạo mật khẩu mới ---
  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const nextErrors: FieldErrors<ForgotFields> = {};
    if (password.length < 8) {
      nextErrors.password = "Mật khẩu mới cần có ít nhất 8 ký tự.";
    } else if (!hasLetterAndDigit(password)) {
      nextErrors.password = "Mật khẩu phải bao gồm cả chữ và số.";
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({
        email: email.trim(),
        otp,
        newPassword: password,
        confirmPassword,
      });
      setStep("success");
      setStatus(null);
    } catch (error) {
      const fieldErrors = extractFieldErrors<ForgotFields>(error);
      if (fieldErrors) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      setStatus({
        tone: "error",
        message: getFriendlyError(error, "Không thể đặt lại mật khẩu. Vui lòng thử lại."),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const titleMap: Record<Step, string> = {
    email: "Lấy lại mật khẩu",
    otp: "Xác thực mã OTP",
    password: "Tạo mật khẩu mới",
    success: "Đặt lại mật khẩu thành công",
  };

  return (
    <AuthShell
      activeAction="login"
      panelAlt="Khuôn viên trường đại học trong ngày nắng"
      panelImage="/images/auth/login-panel.png"
      title={titleMap[step]}
    >
      {/* Chỉ báo các bước */}
      {step !== "success" ? (
        <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
              step === "email" ? "bg-primary text-white" : "bg-primary-soft text-primary",
            )}
          >
            1
          </span>
          <span
            className={cn(
              "h-0.5 w-6 rounded-full transition-colors",
              step !== "email" ? "bg-primary" : "bg-slate-200",
            )}
          />
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
              step === "otp"
                ? "bg-primary text-white"
                : step === "password"
                  ? "bg-primary-soft text-primary"
                  : "bg-slate-100 text-slate-400",
            )}
          >
            2
          </span>
          <span
            className={cn(
              "h-0.5 w-6 rounded-full transition-colors",
              step === "password" ? "bg-primary" : "bg-slate-200",
            )}
          />
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
              step === "password" ? "bg-primary text-white" : "bg-slate-100 text-slate-400",
            )}
          >
            3
          </span>
        </div>
      ) : null}

      {/* BƯỚC 1: NHẬP EMAIL */}
      {step === "email" ? (
        <form className="space-y-4 animate-page sm:space-y-5" noValidate onSubmit={handleSendEmail}>
          {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}
          <p className="text-center text-xs leading-5 text-muted sm:text-sm sm:leading-6">
            Nhập email tài khoản EduAlto để nhận mã xác minh OTP gồm 6 chữ số.
          </p>
          <FormField
            id="email"
            label="Email tài khoản"
            type="email"
            autoComplete="email"
            placeholder="teehihi@vng.com.vn"
            value={email}
            error={errors.email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError("email");
            }}
            disabled={submitting}
          />
          <Button
            className="h-11 w-full rounded-xl px-6 text-sm font-semibold sm:h-12 sm:text-base"
            loading={submitting}
            type="submit"
            aria-label="Gửi mã xác minh"
          >
            Gửi mã xác minh
          </Button>
          <p className="pt-1 text-center text-xs text-muted sm:text-sm">
            Nhớ mật khẩu?{" "}
            <Link
              className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark"
              href="/login"
            >
              Quay lại đăng nhập
            </Link>
          </p>
        </form>
      ) : null}

      {/* BƯỚC 2: NHẬP MÃ OTP */}
      {step === "otp" ? (
        <form className="space-y-4 animate-page sm:space-y-5" noValidate onSubmit={handleVerifyOtp}>
          {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}
          <p className="text-center text-xs leading-5 text-muted sm:text-sm">
            Mã OTP 6 chữ số đã được gửi đến{" "}
            <span className="font-semibold text-primary">
              {isEmail(email) ? email.trim() : "email của bạn"}
            </span>
            .
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-heading sm:text-sm" htmlFor="otp">
              Mã xác minh 6 chữ số
            </label>
            <OtpInput
              autoFocus
              value={otp}
              error={errors.otp}
              disabled={submitting || resending}
              onChange={(value) => {
                setOtp(sanitizeOtp(value));
                clearError("otp");
              }}
            />
          </div>

          <div className="text-center text-xs text-muted sm:text-sm">
            Chưa nhận được mã?{" "}
            <button
              className="focus-ring rounded-lg font-semibold text-primary transition hover:text-primary-dark disabled:cursor-not-allowed disabled:text-[#B5B5B5]"
              disabled={cooldown > 0 || submitting || resending}
              type="button"
              onClick={handleResendOtp}
            >
              {cooldown > 0
                ? `Gửi lại sau ${cooldown}s`
                : resending
                  ? "Đang gửi..."
                  : "Gửi lại OTP"}
            </button>
          </div>

          <Button
            className="h-11 w-full rounded-xl px-6 text-sm font-semibold sm:h-12 sm:text-base"
            loading={submitting}
            disabled={resending}
            type="submit"
            aria-label="Xác nhận mã"
          >
            Xác nhận mã
          </Button>

          <div className="flex items-center justify-between gap-2 pt-1 text-xs sm:text-sm">
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-1 rounded-lg font-medium text-slate-500 hover:text-heading"
              onClick={() => {
                setStep("email");
                setStatus(null);
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Đổi email khác
            </button>
            <Link
              className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark"
              href="/login"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      ) : null}

      {/* BƯỚC 3: TẠO MẬT KHẨU MỚI */}
      {step === "password" ? (
        <form
          className="space-y-4 animate-page sm:space-y-4.5"
          noValidate
          onSubmit={handleResetPassword}
        >
          {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}
          <p className="text-center text-xs leading-5 text-muted sm:text-sm">
            Tạo mật khẩu mới an toàn cho tài khoản EduAlto của bạn.
          </p>

          <PasswordField
            id="password"
            label="Mật khẩu mới"
            autoComplete="new-password"
            placeholder="Tối thiểu 8 ký tự (chữ và số)"
            value={password}
            error={errors.password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearError("password");
            }}
            disabled={submitting}
          />

          <PasswordField
            id="confirmPassword"
            label="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            error={errors.confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearError("confirmPassword");
            }}
            disabled={submitting}
          />

          <Button
            className="h-11 w-full rounded-xl px-6 text-sm font-semibold sm:h-12 sm:text-base"
            loading={submitting}
            type="submit"
            aria-label="Cập nhật mật khẩu"
          >
            Cập nhật mật khẩu
          </Button>

          <div className="pt-1 text-center text-xs sm:text-sm">
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-1 rounded-lg text-primary hover:underline"
              onClick={() => {
                setStep("otp");
                setStatus(null);
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại bước nhập mã OTP
            </button>
          </div>
        </form>
      ) : null}

      {/* BƯỚC 4: THÀNH CÔNG */}
      {step === "success" ? (
        <div className="space-y-5 py-2 text-center animate-page">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E4F7F0] text-primary shadow-sm sm:h-18 sm:w-18">
            <CheckCircle2 className="h-10 w-10 text-primary stroke-[2.2] sm:h-11 sm:w-11" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-heading sm:text-xl">
              Đặt lại mật khẩu thành công!
            </h3>
            <p className="text-xs leading-5 text-muted sm:text-sm sm:leading-6">
              Mật khẩu tài khoản EduAlto của bạn đã được cập nhật. Bạn có thể sử dụng mật khẩu mới
              để đăng nhập ngay bây giờ.
            </p>
          </div>
          <div className="pt-2">
            <Button
              className="h-11 w-full rounded-xl px-6 text-sm font-semibold sm:h-12 sm:text-base"
              type="button"
              onClick={() => router.push("/login")}
            >
              Đăng nhập ngay
            </Button>
          </div>
        </div>
      ) : null}
    </AuthShell>
  );
}
