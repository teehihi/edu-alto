"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField, PasswordField } from "@/features/auth/form-field";
import { getFriendlyError, isEmail, type FieldErrors } from "@/features/auth/form-utils";
import { register } from "./auth-client";
import { AuthShell } from "./auth-shell";

type RegisterFields = "fullName" | "email" | "password" | "confirmPassword" | "terms";

export function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<RegisterFields>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const nextErrors: FieldErrors<RegisterFields> = {};

    if (fullName.trim().length < 2) {
      nextErrors.fullName = "Vui lòng nhập họ và tên.";
    }

    if (!isEmail(email)) {
      nextErrors.email = "Vui lòng nhập email hợp lệ.";
    }

    if (password.length < 8) {
      nextErrors.password = "Mật khẩu cần có ít nhất 8 ký tự.";
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
    }

    if (!acceptedTerms) {
      nextErrors.terms = "Bạn cần đồng ý với điều khoản sử dụng để tiếp tục.";
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
      await register({ fullName: fullName.trim(), email: email.trim(), password, confirmPassword });
      setStatus({ tone: "success", message: "Tạo tài khoản thành công. Vui lòng kiểm tra email để lấy mã xác thực." });
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể tạo tài khoản. Vui lòng thử lại sau.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Tạo tài khoản"
      title="Bắt đầu học trên EduAlto"
      description="Tạo tài khoản để lưu tiến độ, tham gia khóa học và nhận thông báo quan trọng."
    >
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}
        <FormField
          id="fullName"
          label="Họ và tên"
          autoComplete="name"
          placeholder="Nguyễn Minh Anh"
          value={fullName}
          error={errors.fullName}
          onChange={(event) => setFullName(event.target.value)}
          disabled={submitting}
        />
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
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
          value={password}
          error={errors.password}
          hint="Nên dùng chữ hoa, chữ thường, số và ký tự đặc biệt."
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
        />
        <PasswordField
          id="confirmPassword"
          label="Nhập lại mật khẩu"
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu"
          value={confirmPassword}
          error={errors.confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={submitting}
        />
        <div className="space-y-2">
          <label className="flex items-start gap-3 text-sm leading-6 text-muted">
            <input
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              disabled={submitting}
            />
            <span>Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật của EduAlto.</span>
          </label>
          {errors.terms ? <p className="text-sm font-medium text-red-600">{errors.terms}</p> : null}
        </div>
        <Button className="w-full" loading={submitting} size="lg" type="submit">
          Tạo tài khoản
        </Button>
        <p className="text-center text-sm text-muted">
          Đã có tài khoản?{" "}
          <Link className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark" href="/login">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
