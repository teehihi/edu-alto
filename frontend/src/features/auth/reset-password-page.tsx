"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField, PasswordField } from "@/features/auth/form-field";
import { getFriendlyError, isEmail, isOtp, sanitizeOtp, type FieldErrors } from "@/features/auth/form-utils";
import { resetPassword, verifyResetOtp } from "./auth-client";
import { AuthShell } from "./auth-shell";

type ResetPasswordFields = "email" | "otp" | "password" | "confirmPassword";

export function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<ResetPasswordFields>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function validateOtp() {
    const nextErrors: FieldErrors<ResetPasswordFields> = {};

    if (!isEmail(email)) {
      nextErrors.email = "Vui lòng nhập email hợp lệ.";
    }

    if (!isOtp(otp)) {
      nextErrors.otp = "Mã đặt lại mật khẩu gồm 6 chữ số.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validatePassword() {
    const nextErrors: FieldErrors<ResetPasswordFields> = {};

    if (!isEmail(email)) {
      nextErrors.email = "Vui lòng nhập email hợp lệ.";
    }

    if (!isOtp(otp)) {
      nextErrors.otp = "Mã đặt lại mật khẩu gồm 6 chữ số.";
    }

    if (password.length < 8) {
      nextErrors.password = "Mật khẩu mới cần có ít nhất 8 ký tự.";
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleVerifyOtp() {
    setStatus(null);

    if (!validateOtp()) {
      return;
    }

    setVerifying(true);
    try {
      await verifyResetOtp({ email: email.trim(), otp });
      setOtpVerified(true);
      setStatus({ tone: "success", message: "Mã hợp lệ. Bạn có thể đặt mật khẩu mới." });
    } catch (error) {
      setOtpVerified(false);
      setStatus({ tone: "error", message: getFriendlyError(error, "Mã đặt lại mật khẩu chưa đúng hoặc đã hết hạn.") });
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!validatePassword()) {
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ email: email.trim(), otp, newPassword: password, confirmPassword });
      setStatus({ tone: "success", message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới." });
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể đặt lại mật khẩu. Vui lòng thử lại.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Đặt lại mật khẩu"
      title="Tạo mật khẩu mới"
      description="Nhập email, mã xác minh và mật khẩu mới để bảo vệ tài khoản EduAlto của bạn."
    >
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
          value={email}
          error={errors.email}
          onChange={(event) => {
            setEmail(event.target.value);
            setOtpVerified(false);
          }}
          disabled={submitting}
        />
        <FormField
          id="otp"
          label="Mã đặt lại mật khẩu"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Nhập 6 chữ số"
          value={otp}
          error={errors.otp}
          action={
            <button
              className="focus-ring rounded-lg text-sm font-semibold text-primary hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={verifying || submitting}
              onClick={handleVerifyOtp}
            >
              {verifying ? "Đang kiểm tra..." : otpVerified ? "Đã xác minh" : "Kiểm tra mã"}
            </button>
          }
          onChange={(event) => {
            setOtp(sanitizeOtp(event.target.value));
            setOtpVerified(false);
          }}
          disabled={submitting}
        />
        <PasswordField
          id="password"
          label="Mật khẩu mới"
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
        />
        <PasswordField
          id="confirmPassword"
          label="Nhập lại mật khẩu mới"
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu mới"
          value={confirmPassword}
          error={errors.confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={submitting}
        />
        <Button className="w-full" loading={submitting} size="lg" type="submit">
          Cập nhật mật khẩu
        </Button>
        <p className="text-center text-sm text-muted">
          Cần mã mới?{" "}
          <Link className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark" href="/forgot-password">
            Gửi lại yêu cầu
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
