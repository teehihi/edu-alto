"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField } from "@/features/auth/form-field";
import { getFriendlyError, isEmail, type FieldErrors } from "@/features/auth/form-utils";
import { forgotPassword } from "./auth-client";
import { AuthShell } from "./auth-shell";

type ForgotPasswordFields = "email";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors<ForgotPasswordFields>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!isEmail(email)) {
      setErrors({ email: "Vui lòng nhập email hợp lệ." });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      setStatus({ tone: "success", message: "Nếu email tồn tại, EduAlto sẽ gửi mã đặt lại mật khẩu trong ít phút." });
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Quên mật khẩu"
      title="Lấy lại quyền truy cập"
      description="Nhập email tài khoản để nhận mã xác minh đặt lại mật khẩu."
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
        <Button className="w-full" loading={submitting} size="lg" type="submit">
          Gửi mã đặt lại mật khẩu
        </Button>
        <p className="text-center text-sm text-muted">
          Nhớ mật khẩu?{" "}
          <Link className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark" href="/login">
            Quay lại đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
