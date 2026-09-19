import { ProfilePage } from "@/features/profile/profile-page";

interface ProfileDynamicPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: ProfileDynamicPageProps) {
  const resolvedParams = await params;
  return <ProfilePage targetIdentifier={resolvedParams.id} />;
}
