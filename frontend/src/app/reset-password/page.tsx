import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { ResetPasswordPage } from "@/features/auth/reset-password-page";

export const metadata = createPrivatePageMetadata("Đặt lại mật khẩu");

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" aria-busy="true" />}>
      <ResetPasswordPage />
    </Suspense>
  );
}
