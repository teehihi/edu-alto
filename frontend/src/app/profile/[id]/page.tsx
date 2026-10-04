import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { ProfilePage } from "@/features/profile/profile-page";

interface ProfileDynamicPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = createPrivatePageMetadata("Hồ sơ học viên");

export default async function Page({ params }: ProfileDynamicPageProps) {
  const resolvedParams = await params;
  return <ProfilePage targetIdentifier={resolvedParams.id} />;
}
