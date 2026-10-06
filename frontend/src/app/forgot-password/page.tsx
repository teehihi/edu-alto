import { Suspense } from "react";
import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { ForgotPasswordPage } from "@/features/auth/forgot-password-page";

export const metadata = createPrivatePageMetadata("Quên mật khẩu");

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" aria-busy="true" />}>
      <ForgotPasswordPage />
    </Suspense>
  );
}
