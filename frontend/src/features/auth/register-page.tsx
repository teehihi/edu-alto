"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField, PasswordField } from "@/features/auth/form-field";
import { getFriendlyError, isEmail, type FieldErrors } from "@/features/auth/form-utils";
import { register } from "./auth-client";
import { AuthDivider, AuthShell, AuthSubmitLabel, SocialLoginButtons } from "./auth-shell";

type RegisterFields = "familyName" | "givenName" | "email" | "password" | "confirmPassword";

export function RegisterPage() {
  const router = useRouter();
  const [familyName, setFamilyName] = useState("");
  const [givenName, setGivenName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<RegisterFields>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const nextErrors: FieldErrors<RegisterFields> = {};

    if (familyName.trim().length < 2) {
      nextErrors.familyName = "Vui lòng nhập họ và tên lót.";
    }

    if (givenName.trim().length < 1) {
      nextErrors.givenName = "Vui lòng nhập tên.";
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
      await register({ fullName: `${familyName.trim()} ${givenName.trim()}`.trim(), email: email.trim(), password, confirmPassword });
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}&sent=1`);
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể tạo tài khoản. Vui lòng thử lại sau.") });
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
      title="Tạo Tài Khoản Mới"
    >
      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            id="familyName"
            label="Họ và Tên lót"
            autoComplete="family-name"
            placeholder="Nguyễn Nhật"
            value={familyName}
            error={errors.familyName}
            onChange={(event) => setFamilyName(event.target.value)}
            disabled={submitting}
          />
          <FormField
            id="givenName"
            label="Tên"
            autoComplete="given-name"
            placeholder="Thiên"
            value={givenName}
            error={errors.givenName}
            onChange={(event) => setGivenName(event.target.value)}
            disabled={submitting}
          />
        </div>
        <FormField
          id="username"
          label="Tên Đăng Nhập"
          autoComplete="username"
          placeholder="teehihi"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={submitting}
        />
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
        <div className="grid gap-6 sm:grid-cols-2">
          <PasswordField
            id="password"
            label="Mật khẩu"
            autoComplete="new-password"
            placeholder="Nhập mật khẩu"
            value={password}
            error={errors.password}
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
        </div>
        <Button className="h-12 w-fit min-w-[183px] px-6 text-base" loading={submitting} type="submit" aria-label="Tạo tài khoản">
          <AuthSubmitLabel>Create Account</AuthSubmitLabel>
        </Button>
        <AuthDivider />
        <SocialLoginButtons />
        <p className="text-center text-sm text-muted lg:hidden">
          Đã có tài khoản?{" "}
          <Link className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark" href="/login">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
