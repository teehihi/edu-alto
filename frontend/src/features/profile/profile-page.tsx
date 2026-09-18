"use client";

import Link from "next/link";
import { LogOut, RefreshCw, Save } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-client";
import { AlertMessage, FormField } from "@/features/auth/form-field";
import { getFriendlyError, type FieldErrors } from "@/features/auth/form-utils";

type ProfileFields = "fullName";

export function ProfilePage() {
  const { user, loading, isAuthenticated, getCurrentUser, updateCurrentUser, logout } = useAuth();
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<FieldErrors<ProfileFields>>({});
  const [status, setStatus] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (user?.fullName) {
      setFullName(user.fullName);
    }
  }, [user?.fullName]);

  async function refreshProfile() {
    setRefreshing(true);
    setStatus(null);
    try {
      const currentUser = await getCurrentUser();
      if (currentUser?.fullName) {
        setFullName(currentUser.fullName);
      }
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể tải hồ sơ. Vui lòng thử lại.") });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (fullName.trim().length < 2) {
      setErrors({ fullName: "Vui lòng nhập họ và tên." });
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await updateCurrentUser({ fullName: fullName.trim() });
      setStatus({ tone: "success", message: "Hồ sơ đã được cập nhật." });
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể cập nhật hồ sơ. Vui lòng thử lại.") });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setSigningOut(true);
    setStatus(null);
    try {
      await logout();
      setFullName("");
      setStatus({ tone: "success", message: "Bạn đã đăng xuất khỏi EduAlto." });
    } catch (error) {
      setStatus({ tone: "error", message: getFriendlyError(error, "Không thể đăng xuất lúc này. Vui lòng thử lại.") });
    } finally {
      setSigningOut(false);
    }
  }

  const roleText = user?.roles?.length ? user.roles.join(", ") : "Người học";
  const verificationText = user?.status === "ACTIVE" ? "Đã xác thực" : "Chờ xác thực";

  return (
    <main className="min-h-screen bg-footer px-5 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link className="focus-ring mb-4 inline-flex rounded-lg text-2xl font-bold text-heading" href="/">
              EduAlto
            </Link>
            <h1 className="text-3xl font-bold tracking-normal text-heading">Hồ sơ học tập</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Quản lý thông tin tài khoản cơ bản đang được hệ thống xác thực hỗ trợ.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={loading || saving || !isAuthenticated} loading={refreshing} type="button" variant="outline" onClick={refreshProfile}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Tải lại
            </Button>
            <Button disabled={loading || !isAuthenticated} loading={signingOut} type="button" variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Đăng xuất
            </Button>
          </div>
        </header>

        <section className="rounded-lg border border-footer-divider bg-white p-5 shadow-soft sm:p-8">
          {loading ? (
            <div className="space-y-5" aria-live="polite" aria-busy="true">
              <div className="h-5 w-40 skeleton" />
              <div className="h-12 w-full skeleton" />
              <div className="h-12 w-full skeleton" />
              <div className="h-11 w-36 skeleton" />
            </div>
          ) : !isAuthenticated || !user ? (
            <div className="space-y-5 text-center">
              {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft text-xl font-bold text-primary">
                E
              </div>
              <div>
                <h2 className="text-xl font-bold text-heading">Bạn chưa đăng nhập</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Đăng nhập để xem và cập nhật hồ sơ học tập của bạn.</p>
              </div>
              <Link
                className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-primary bg-primary px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-dark active:bg-primary-dark"
                href="/login"
              >
                Đến trang đăng nhập
              </Link>
            </div>
          ) : (
            <form className="space-y-6" noValidate onSubmit={handleSubmit}>
              {status ? <AlertMessage tone={status.tone}>{status.message}</AlertMessage> : null}
              <div className="flex flex-col gap-4 border-b border-footer-divider pb-6 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-2xl font-bold text-primary">
                  {fullName.trim().charAt(0).toUpperCase() || "E"}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-heading">{fullName || "Người học EduAlto"}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {verificationText} · {user.email}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  id="fullName"
                  label="Họ và tên"
                  autoComplete="name"
                  value={fullName}
                  error={errors.fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={saving}
                />
                <FormField
                  id="email"
                  label="Email"
                  type="email"
                  value={user.email}
                  hint="Email dùng để đăng nhập và nhận thông báo bảo mật."
                  disabled
                  readOnly
                />
                <FormField id="status" label="Trạng thái tài khoản" value={verificationText} disabled readOnly />
                <FormField id="roles" label="Vai trò" value={roleText} disabled readOnly />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-footer-divider pt-6 sm:flex-row sm:justify-end">
                <Button disabled={saving} type="button" variant="outline" onClick={() => setFullName(user.fullName)}>
                  Hoàn tác
                </Button>
                <Button loading={saving} type="submit">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Lưu hồ sơ
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
