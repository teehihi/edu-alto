"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, FormField, PasswordField } from "@/features/auth/form-field";
import { extractFieldErrors, getFriendlyError, hasLetterAndDigit, isEmail, type FieldErrors } from "@/features/auth/form-utils";
import { cn } from "@/lib/cn";
import { register } from "./auth-client";
import { AuthDivider, AuthShell, AuthSubmitLabel, SocialLoginButtons } from "./auth-shell";

type RegisterRole = "STUDENT" | "INSTRUCTOR";
type RegisterFields = "fullName" | "email" | "password" | "confirmPassword" | "expertise" | "learningGoal" | "bio";

export function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RegisterRole>("STUDENT");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [expertise, setExpertise] = useState("");
  const [bio, setBio] = useState("");
  const [errors, setErrors] = useState<FieldErrors<RegisterFields>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clearError(field: RegisterFields) {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleRoleChange(newRole: RegisterRole) {
    if (newRole === role) return;
    setRole(newRole);
    // Reset role-specific field values and errors to prevent stale retention
    setLearningGoal("");
    setExpertise("");
    setBio("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next.expertise;
      delete next.learningGoal;
      delete next.bio;
      return next;
    });
  }

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
    } else if (!hasLetterAndDigit(password)) {
      nextErrors.password = "Mật khẩu phải bao gồm cả chữ và số.";
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
    }

    if (role === "INSTRUCTOR" && expertise.trim().length < 2) {
      nextErrors.expertise = "Vui lòng nhập chuyên môn giảng dạy.";
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
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role,
        ...(bio.trim() ? { bio: bio.trim() } : {}),
        ...(role === "INSTRUCTOR" ? { expertise: expertise.trim() } : {})
      });
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}&sent=1`);
    } catch (error) {
      const fieldErrors = extractFieldErrors<RegisterFields>(error);
      if (fieldErrors) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      setStatus({
        tone: "error",
        message: getFriendlyError(error, "Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.")
      });
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
      <form className="space-y-3 sm:space-y-3.5" noValidate onSubmit={handleSubmit}>
        {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}

        {/* Role Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-heading sm:text-sm">
            Bạn muốn tham gia EduAlto với vai trò nào?
          </label>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-1" role="radiogroup" aria-label="Vai trò tài khoản">
            <button
              type="button"
              role="radio"
              aria-checked={role === "STUDENT"}
              onClick={() => handleRoleChange("STUDENT")}
              disabled={submitting}
              className={cn(
                "focus-ring flex h-10 items-center justify-center gap-2 rounded-md text-xs font-medium transition duration-150 sm:text-sm",
                role === "STUDENT"
                  ? "border border-slate-200 bg-white font-semibold text-primary shadow-xs"
                  : "text-muted hover:text-heading"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full transition", role === "STUDENT" ? "bg-primary" : "bg-slate-300")} />
              <span>Học viên</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === "INSTRUCTOR"}
              onClick={() => handleRoleChange("INSTRUCTOR")}
              disabled={submitting}
              className={cn(
                "focus-ring flex h-10 items-center justify-center gap-2 rounded-md text-xs font-medium transition duration-150 sm:text-sm",
                role === "INSTRUCTOR"
                  ? "border border-slate-200 bg-white font-semibold text-primary shadow-xs"
                  : "text-muted hover:text-heading"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full transition", role === "INSTRUCTOR" ? "bg-primary" : "bg-slate-300")} />
              <span>Giảng viên</span>
            </button>
          </div>
        </div>

        <FormField
          id="fullName"
          label="Họ và tên"
          autoComplete="name"
          placeholder="Nguyễn Nhật Thiên"
          value={fullName}
          error={errors.fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            clearError("fullName");
          }}
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
          onChange={(event) => {
            setEmail(event.target.value);
            clearError("email");
          }}
          disabled={submitting}
        />

        {role === "STUDENT" ? (
          <FormField
            id="bio"
            label="Tiểu sử"
            placeholder="Kể cho chúng tôi và người dùng khác đôi nét về bạn..."
            value={bio}
            error={errors.bio}
            onChange={(event) => {
              setBio(event.target.value);
              clearError("bio");
            }}
            hint="Không bắt buộc. Thông tin này sẽ hiển thị ở phần giới thiệu bản thân trong hồ sơ."
            disabled={submitting}
          />
        ) : (
          <div className="space-y-3 sm:space-y-3.5">
            <FormField
              id="expertise"
              label="Chuyên môn giảng dạy"
              placeholder="Ví dụ: Lập trình Web, Trí tuệ nhân tạo, Thiết kế UI/UX..."
              value={expertise}
              error={errors.expertise}
              onChange={(event) => {
                setExpertise(event.target.value);
                clearError("expertise");
              }}
              disabled={submitting}
            />
            <FormField
              id="bio"
              label="Tiểu sử"
              placeholder="Ví dụ: 5 năm kinh nghiệm phát triển phần mềm và đào tạo lập trình..."
              value={bio}
              error={errors.bio}
              onChange={(event) => {
                setBio(event.target.value);
                clearError("bio");
              }}
              hint="Không bắt buộc. Thông tin này sẽ hiển thị ở phần giới thiệu bản thân trong hồ sơ."
              disabled={submitting}
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <PasswordField
            id="password"
            label="Mật khẩu"
            autoComplete="new-password"
            placeholder="Tối thiểu 8 ký tự (chữ và số)"
            value={password}
            error={errors.password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearError("password");
            }}
            disabled={submitting}
          />
          <PasswordField
            id="confirmPassword"
            label="Nhập lại mật khẩu"
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            error={errors.confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearError("confirmPassword");
            }}
            disabled={submitting}
          />
        </div>

        <Button className="h-11 w-full rounded-xl px-6 text-sm font-semibold sm:h-12 sm:text-base" loading={submitting} type="submit" aria-label="Đăng ký">
          Đăng ký
        </Button>
        <AuthDivider />
        <SocialLoginButtons />
        <p className="pt-1 text-center text-sm text-muted">
          Đã có tài khoản?{" "}
          <Link className="focus-ring rounded-lg font-semibold text-primary hover:text-primary-dark" href="/login">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
