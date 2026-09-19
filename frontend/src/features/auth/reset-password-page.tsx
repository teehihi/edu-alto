"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField, PasswordField } from "@/features/auth/form-field";
import { extractFieldErrors, getFriendlyError, hasLetterAndDigit, isEmail, isOtp, sanitizeOtp, type FieldErrors } from "@/features/auth/form-utils";
import { forgotPassword, resetPassword, verifyResetOtp } from "./auth-client";
import { AuthShell, OtpInput } from "./auth-shell";

type ResetPasswordFields = "email" | "otp" | "password" | "confirmPassword";

export function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email")?.trim() ?? "";
  const sent = searchParams.get("sent") === "1";

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"otp" | "password">("otp");
  const [cooldown, setCooldown] = useState(sent ? 60 : 0);
  const [resending, setResending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<ResetPasswordFields>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [email, initialEmail]);

  useEffect(() => {
    if (sent && step === "otp") {
      setStatus({ tone: "info", message: "Mã xác minh đặt lại mật khẩu đã được gửi đến email của bạn." });
    }
  }, [sent, step]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function clearError(field: ResetPasswordFields) {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validateOtpStep() {
    const nextErrors: FieldErrors<ResetPasswordFields> = {};

    if (!isEmail(email)) {
      nextErrors.email = "Vui lòng nhập email hợp lệ.";
    }

    if (!isOtp(otp)) {
      nextErrors.otp = "Mã xác minh gồm 6 chữ số.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validatePasswordStep() {
    const nextErrors: FieldErrors<ResetPasswordFields> = {};

    if (password.length < 8) {
      nextErrors.password = "Mật khẩu mới cần có ít nhất 8 ký tự.";
    } else if (!hasLetterAndDigit(password)) {
      nextErrors.password = "Mật khẩu phải bao gồm cả chữ và số.";
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!validateOtpStep()) {
      return;
    }

    setSubmitting(true);
    try {
      await verifyResetOtp({ email: email.trim(), otp });
      setStep("password");
      setStatus({ tone: "success", message: "Xác minh mã thành công! Vui lòng tạo mật khẩu mới cho tài khoản." });
      setErrors({});
    } catch (error) {
      const fieldErrors = extractFieldErrors<ResetPasswordFields>(error);
      if (fieldErrors) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      setStatus({ tone: "error", message: getFriendlyError(error, "Mã đặt lại mật khẩu chưa đúng hoặc đã hết hạn.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (cooldown > 0 || resending || submitting) return;
    setStatus(null);

    if (!isEmail(email)) {
      setErrors((prev) => ({ ...prev, email: "Vui lòng nhập email hợp lệ." }));
      return;
    }

    setResending(true);
    try {
      await forgotPassword({ email: email.trim() });
      setCooldown(60);
      setOtp("");
      setErrors({});
      setStatus({ tone: "info", message: "Mã xác minh mới đã được gửi đến email của bạn." });
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể gửi lại mã lúc này. Vui lòng thử lại sau.") });
    } finally {
      setResending(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resetComplete) return;
    setStatus(null);

    if (!validatePasswordStep()) {
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ email: email.trim(), otp, newPassword: password, confirmPassword });
      setResetComplete(true);
      setStatus({
        tone: "success",
        message: "Đặt lại mật khẩu thành công! Đang chuyển hướng sang trang đăng nhập..."
      });
      window.setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      const fieldErrors = extractFieldErrors<ResetPasswordFields>(error);
      if (fieldErrors) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể đặt lại mật khẩu. Vui lòng thử lại.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      activeAction="login"
      panelAlt="Logo EduAlto và chồng sách học tập"
      panelImage="/images/auth/register-panel.png"
      panelSide="right"
      title={step === "otp" ? "Xác thực đặt lại mật khẩu" : "Tạo mật khẩu mới"}
    >
      {step === "otp" ? (
        <form className="space-y-4 sm:space-y-5 animate-page" noValidate onSubmit={handleVerifyOtp}>
          {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}
          <p className="text-center text-xs leading-5 text-muted sm:text-sm">
            Nhập mã OTP gồm 6 chữ số đã gửi đến{" "}
            <span className="font-semibold text-primary">{isEmail(email) ? email.trim() : "email của bạn"}</span> để tiếp tục.
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
            disabled={submitting || resending}
          />

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
              {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : resending ? "Đang gửi..." : "Gửi lại OTP"}
            </button>
          </div>

          <div className="flex justify-center pt-1">
            <Button
              className="h-11 w-fit min-w-[180px] rounded-xl px-8 text-sm font-semibold sm:h-12 sm:min-w-[200px] sm:text-base"
              loading={submitting}
              disabled={resending}
              type="submit"
              aria-label="Xác nhận mã"
            >
              Xác nhận mã
            </Button>
          </div>

          <p className="pt-1 text-center text-xs text-muted sm:text-sm">
            Nhớ lại mật khẩu?{" "}
            <Link className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark" href="/login">
              Quay lại đăng nhập
            </Link>
          </p>
        </form>
      ) : (
        <form className="space-y-4 sm:space-y-4.5 animate-page" noValidate onSubmit={handleResetPassword}>
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
            disabled={submitting || resetComplete}
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
            disabled={submitting || resetComplete}
          />

          <Button
            className="h-11 w-full rounded-xl px-6 text-sm font-semibold sm:h-12 sm:text-base"
            disabled={resetComplete}
            loading={submitting}
            type="submit"
            aria-label="Cập nhật mật khẩu"
          >
            Cập nhật mật khẩu
          </Button>

          <p className="pt-1 text-center text-xs text-muted sm:text-sm">
            {resetComplete ? (
              <Link className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark" href="/login">
                Đăng nhập ngay
              </Link>
            ) : (
              <button
                type="button"
                className="focus-ring rounded-lg text-primary hover:underline"
                onClick={() => setStep("otp")}
              >
                ← Quay lại bước nhập mã OTP
              </button>
            )}
          </p>
        </form>
      )}
    </AuthShell>
  );
}
