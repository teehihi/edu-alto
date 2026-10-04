import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { RegisterPage } from "@/features/auth/register-page";

export const metadata = createPrivatePageMetadata("Tạo tài khoản");

export default function Page() {
  return <RegisterPage />;
}
