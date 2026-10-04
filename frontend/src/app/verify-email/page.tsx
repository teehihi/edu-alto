import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { VerifyEmailPage } from "@/features/auth/verify-email-page";

export const metadata = createPrivatePageMetadata("Xác minh email");

export default function Page() {
  return <VerifyEmailPage />;
}
