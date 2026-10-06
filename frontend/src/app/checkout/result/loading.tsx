import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { CheckoutResultSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AppHeader />
      <CheckoutResultSkeleton />
      <Footer />
    </div>
  );
}
