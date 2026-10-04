import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { ForgotPasswordPage } from "@/features/auth/forgot-password-page";

export const metadata = createPrivatePageMetadata("Quên mật khẩu");

export default function Page() {
  return <ForgotPasswordPage />;
}
