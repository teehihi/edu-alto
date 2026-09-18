"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField } from "@/features/auth/form-field";
import { getFriendlyError, isEmail, isOtp, sanitizeOtp, type FieldErrors } from "@/features/auth/form-utils";
import { resendVerification, verifyEmail } from "./auth-client";
import { AuthShell } from "./auth-shell";

type VerifyEmailFields = "email" | "otp";

export function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState<FieldErrors<VerifyEmailFields>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => setCooldown((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function validate() {
    const nextErrors: FieldErrors<VerifyEmailFields> = {};

    if (!isEmail(email)) {
      nextErrors.email = "Vui lòng nhập email hợp lệ.";
    }

    if (!isOtp(otp)) {
      nextErrors.otp = "Mã xác thực gồm 6 chữ số.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await verifyEmail({ email: email.trim(), otp });
      setStatus({ tone: "success", message: "Xác thực email thành công. Bạn có thể đăng nhập vào EduAlto." });
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể xác thực email. Vui lòng kiểm tra lại mã.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setStatus(null);

    if (!isEmail(email)) {
      setErrors((current) => ({ ...current, email: "Nhập email hợp lệ trước khi gửi lại mã." }));
      return;
    }

    setResending(true);
    try {
      await resendVerification({ email: email.trim() });
      setCooldown(60);
      setStatus({ tone: "info", message: "Mã xác thực mới đã được gửi. Vui lòng kiểm tra hộp thư của bạn." });
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể gửi lại mã lúc này. Vui lòng thử lại sau.") });
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Xác thực email"
      title="Nhập mã xác thực"
      description="EduAlto đã gửi mã gồm 6 chữ số tới email đăng ký của bạn."
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
          onChange={(event) => setEmail(event.target.value)}
          disabled={submitting}
        />
        <FormField
          id="otp"
          label="Mã xác thực"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Nhập 6 chữ số"
          value={otp}
          error={errors.otp}
          onChange={(event) => setOtp(sanitizeOtp(event.target.value))}
          disabled={submitting}
        />
        <Button className="w-full" loading={submitting} size="lg" type="submit">
          Xác thực email
        </Button>
        <Button
          className="w-full"
          disabled={cooldown > 0 || submitting}
          loading={resending}
          type="button"
          variant="secondary"
          onClick={handleResend}
        >
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã xác thực"}
        </Button>
        <p className="text-center text-sm text-muted">
          Đã xác thực?{" "}
          <Link className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark" href="/login">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
