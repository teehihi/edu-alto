import { AppHeader } from "@/components/layout/app-header";
import { AboutSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <AboutSkeleton withoutHeader />
    </div>
  );
}
