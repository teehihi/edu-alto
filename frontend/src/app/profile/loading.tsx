import { AppHeader } from "@/components/layout/app-header";
import { ProfileSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="flex min-h-screen flex-col justify-between"
      style={{
        background:
          "linear-gradient(180deg, #E6F7F2 0%, #F2FAF7 320px, #FFFFFF 680px, #FFFFFF 100%)",
      }}
    >
      <AppHeader transparent />
      <main className="flex-1 min-h-[calc(100vh-72px)] py-6 sm:py-8 flex flex-col justify-start">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <ProfileSkeleton />
        </div>
      </main>
    </div>
  );
}
