import { AppHeader } from "@/components/layout/app-header";
import { ContactSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F5FBF9]">
      <AppHeader />
      <ContactSkeleton withoutHeader />
    </div>
  );
}
