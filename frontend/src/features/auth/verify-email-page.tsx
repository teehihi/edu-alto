"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField } from "@/features/auth/form-field";
import { getFriendlyError, isEmail, isOtp, sanitizeOtp, type FieldErrors } from "@/features/auth/form-utils";
import { resendVerification, verifyEmail } from "./auth-client";
import { AuthSubmitLabel, OtpInput, OtpSuccessModal } from "./auth-shell";

type VerifyEmailFields = "email" | "otp";

export function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState<FieldErrors<VerifyEmailFields>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingEmail, setEditingEmail] = useState(true);
  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialEmail = params.get("email") ?? "";
    if (isEmail(initialEmail)) {
      setEmail(initialEmail);
      setEditingEmail(false);
      if (params.get("sent") === "1") setCooldown(60);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => setCooldown((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!showSuccessModal) {
      return undefined;
    }

    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [router, showSuccessModal]);

  useEffect(() => {
    if (showSuccessModal && seconds === 0) router.push("/login");
  }, [router, showSuccessModal, seconds]);

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
    if (submitting || resending || showSuccessModal) return;
    setStatus(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await verifyEmail({ email: email.trim(), otp });
      setShowSuccessModal(true);
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể xác thực email. Vui lòng kiểm tra lại mã.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || submitting || resending || showSuccessModal) return;
    setStatus(null);

    if (!isEmail(email)) {
      setErrors((current) => ({ ...current, email: "Nhập email hợp lệ trước khi gửi lại mã." }));
      return;
    }

    setResending(true);
    try {
      await resendVerification({ email: email.trim() });
      setCooldown(60);
      setOtp("");
      setErrors({});
      setEditingEmail(false);
      setStatus({ tone: "info", message: "Mã OTP mới đã được gửi. Vui lòng kiểm tra hộp thư của bạn." });
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể gửi lại mã lúc này. Vui lòng thử lại sau.") });
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] h-[100dvh] w-full flex-col items-center justify-center overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-6">
      <OtpSuccessModal open={showSuccessModal} seconds={seconds} />
      <form
        className="mx-auto flex w-full max-w-[520px] flex-col items-center justify-center text-center my-auto animate-page"
        noValidate
        onSubmit={handleSubmit}
      >
        <Image
          className="mb-3 h-[130px] w-[180px] object-contain sm:mb-4 sm:h-[160px] sm:w-[220px]"
          src="/images/auth/otp-illustration.svg"
          alt=""
          width={280}
          height={200}
          priority
          aria-hidden="true"
        />
        <h1 className="text-xl font-semibold leading-tight tracking-normal text-primary sm:text-2xl md:text-[28px]">
          Xác thực email của bạn
        </h1>
        <p className="mt-2 text-xs font-medium leading-relaxed text-heading sm:mt-2.5 sm:text-sm md:text-base">
          Nhập mã OTP gồm 6 chữ số được gửi đến{" "}
          <span className="font-semibold text-primary">{isEmail(email) ? email.trim() : "email của bạn"}</span>!
        </p>

        {status ? (
          <div className="mt-2.5 w-full max-w-md">
            <AlertMessage tone={status.tone}>{status.message}</AlertMessage>
          </div>
        ) : null}

        {editingEmail ? (
          <div className="mt-2.5 w-full max-w-md text-left">
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
                setOtp("");
                setStatus(null);
              }}
              disabled={submitting || resending || showSuccessModal}
            />
          </div>
        ) : (
          <button
            type="button"
            className="focus-ring mt-1.5 rounded-lg text-xs font-medium text-primary hover:underline disabled:opacity-60 sm:text-sm"
            disabled={submitting || resending || showSuccessModal}
            onClick={() => {
              setEditingEmail(true);
              setOtp("");
              setStatus(null);
            }}
          >
            Thay đổi email
          </button>
        )}

        <div className="my-3 w-full max-w-[420px] sm:my-4">
          <OtpInput
            autoFocus
            value={otp}
            error={errors.otp}
            disabled={submitting || resending || showSuccessModal}
            onChange={(value) => {
              setOtp(sanitizeOtp(value));
              setErrors((current) => ({ ...current, otp: undefined }));
            }}
          />
        </div>

        <div className="text-xs text-muted sm:text-sm">
          Chưa nhận được mã?{" "}
          <button
            className="focus-ring rounded-lg font-semibold text-primary transition hover:text-primary-dark disabled:cursor-not-allowed disabled:text-[#B5B5B5]"
            disabled={cooldown > 0 || submitting || resending || showSuccessModal}
            type="button"
            onClick={handleResend}
          >
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : resending ? "Đang gửi..." : "Gửi lại OTP"}
          </button>
        </div>

        <Button
          className="mt-4 h-11 w-fit min-w-[180px] rounded-xl px-8 text-sm font-semibold sm:mt-5 sm:h-12 sm:min-w-[200px] sm:text-base"
          loading={submitting}
          disabled={resending || showSuccessModal}
          type="submit"
          aria-label="Xác nhận"
        >
          Xác nhận
        </Button>

        <Link
          className="focus-ring mt-3 text-xs font-semibold text-primary hover:text-primary-dark sm:text-sm"
          href="/login"
        >
          Quay lại đăng nhập
        </Link>
      </form>
    </main>
  );
}
