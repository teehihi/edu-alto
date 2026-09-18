"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField } from "@/features/auth/form-field";
import { getFriendlyError, isEmail, type FieldErrors } from "@/features/auth/form-utils";
import { forgotPassword } from "./auth-client";
import { AuthShell, AuthSubmitLabel } from "./auth-shell";

type ForgotPasswordFields = "email";

export function ForgotPasswordPage() {
  const router = useRouter();
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
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}&sent=1`);
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      activeAction="login"
      panelAlt="Khuôn viên trường đại học trong ngày nắng"
      panelImage="/images/auth/login-panel.png"
      title="Lấy lại mật khẩu"
    >
      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}
        <p className="text-center text-base leading-7 text-muted">
          Nhập email tài khoản để nhận mã xác minh đặt lại mật khẩu.
        </p>
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="teehihi@vng.com.vn"
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={submitting}
        />
        <Button className="h-12 w-fit min-w-[190px] px-6 text-base" loading={submitting} type="submit">
          <AuthSubmitLabel>Gửi mã</AuthSubmitLabel>
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
