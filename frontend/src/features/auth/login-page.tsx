"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField, PasswordField } from "@/features/auth/form-field";
import { getFriendlyError, isEmail, type FieldErrors } from "@/features/auth/form-utils";
import { useAuth } from "./auth-client";
import { AuthShell } from "./auth-shell";

type LoginFields = "email" | "password";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<LoginFields>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const nextErrors: FieldErrors<LoginFields> = {};

    if (!isEmail(email)) {
      nextErrors.email = "Vui lòng nhập email hợp lệ.";
    }

    if (!password) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
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
      await login({ email: email.trim(), password });
      setStatus({ tone: "success", message: "Đăng nhập thành công. EduAlto đang chuẩn bị không gian học tập cho bạn." });
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Đăng nhập"
      title="Chào mừng bạn quay lại"
      description="Đăng nhập để tiếp tục khóa học, bài tập và tiến độ học tập của bạn trên EduAlto."
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
        <PasswordField
          id="password"
          label="Mật khẩu"
          autoComplete="current-password"
          placeholder="Nhập mật khẩu"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
        />
        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 text-muted">
            <input className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" type="checkbox" disabled={submitting} />
            Ghi nhớ đăng nhập
          </label>
          <Link className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark" href="/forgot-password">
            Quên mật khẩu?
          </Link>
        </div>
        <Button className="w-full" loading={submitting} size="lg" type="submit">
          Đăng nhập
        </Button>
        <p className="text-center text-sm text-muted">
          Chưa có tài khoản?{" "}
          <Link className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark" href="/register">
            Tạo tài khoản
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
