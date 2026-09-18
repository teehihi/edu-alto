"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField, PasswordField } from "@/features/auth/form-field";
import { getFriendlyError, isEmail, isOtp, sanitizeOtp, type FieldErrors } from "@/features/auth/form-utils";
import { resetPassword, verifyResetOtp } from "./auth-client";
import { AuthShell, AuthSubmitLabel, OtpInput } from "./auth-shell";

type ResetPasswordFields = "email" | "otp" | "password" | "confirmPassword";

export function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email")?.trim() ?? "";
  const sent = searchParams.get("sent") === "1";
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<ResetPasswordFields>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [email, initialEmail]);

  useEffect(() => {
    if (sent) {
      setStatus({ tone: "info", message: "Mã đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email của bạn." });
    }
  }, [sent]);

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

    const requestEmail = email.trim();
    const requestOtp = otp;
    setVerifying(true);
    try {
      await verifyResetOtp({ email: requestEmail, otp: requestOtp });
      if (email.trim() !== requestEmail || otp !== requestOtp) {
        return;
      }
      setOtpVerified(true);
      setStatus({ tone: "success", message: "Mã hợp lệ. Bạn có thể đặt mật khẩu mới." });
    } catch (error) {
      if (email.trim() !== requestEmail || otp !== requestOtp) {
        return;
      }
      setOtpVerified(false);
      setStatus({ tone: "error", message: getFriendlyError(error, "Mã đặt lại mật khẩu chưa đúng hoặc đã hết hạn.") });
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resetComplete) {
      return;
    }
    setStatus(null);

    if (!validatePassword()) {
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ email: email.trim(), otp, newPassword: password, confirmPassword });
      setResetComplete(true);
      setStatus({ tone: "success", message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới." });
    } catch (error) {
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
      title="Tạo mật khẩu mới"
    >
      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}
        <p className="text-center text-base leading-7 text-muted">
          Nhập email, mã xác minh và mật khẩu mới để bảo vệ tài khoản EduAlto.
        </p>
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="teehihi@vng.com.vn"
          value={email}
          error={errors.email}
          onChange={(event) => {
            setEmail(event.target.value);
            setOtpVerified(false);
          }}
          disabled={submitting}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-semibold text-heading" htmlFor="otp-0">Mã đặt lại mật khẩu</label>
            <button
              className="focus-ring rounded-lg text-sm font-semibold text-primary hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={verifying || submitting}
              onClick={handleVerifyOtp}
            >
              {verifying ? "Đang kiểm tra..." : otpVerified ? "Đã xác minh" : "Kiểm tra mã"}
            </button>
          </div>
          <OtpInput
            value={otp}
            error={errors.otp}
            disabled={verifying || submitting}
            onChange={(value) => {
              setOtp(sanitizeOtp(value));
              setOtpVerified(false);
            }}
          />
        </div>
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
        <Button className="h-12 w-fit min-w-[190px] px-6 text-base" disabled={resetComplete} loading={submitting} type="submit">
          <AuthSubmitLabel>Cập nhật mật khẩu</AuthSubmitLabel>
        </Button>
        <p className="text-center text-sm text-muted">
          {resetComplete ? "Mật khẩu đã được cập nhật. " : "Cần mã mới? "}
          <Link className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark" href={resetComplete ? "/login" : "/forgot-password"}>
            {resetComplete ? "Đăng nhập ngay" : "Gửi lại yêu cầu"}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
