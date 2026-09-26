import { ProfileSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      className="min-h-screen pb-16 pt-6 sm:px-6 lg:px-8"
      style={{
        background:
          "linear-gradient(180deg, #E6F7F2 0%, #F2FAF7 320px, #FFFFFF 680px, #FFFFFF 100%)",
      }}
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-0">
        <ProfileSkeleton />
      </div>
    </main>
  );
}
