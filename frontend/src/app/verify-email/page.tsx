import { Suspense } from "react";
import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { VerifyEmailPage } from "@/features/auth/verify-email-page";

export const metadata = createPrivatePageMetadata("Xác minh email");

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" aria-busy="true" />}>
      <VerifyEmailPage />
    </Suspense>
  );
}
