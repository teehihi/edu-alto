import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { LoginPage } from "@/features/auth/login-page";

export const metadata = createPrivatePageMetadata("Đăng nhập");

export default function Page() {
  return <LoginPage />;
}
