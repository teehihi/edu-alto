import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { ProfilePage } from "@/features/profile/profile-page";

export const metadata = createPrivatePageMetadata("Hồ sơ cá nhân");

export default function Page() {
  return <ProfilePage />;
}
