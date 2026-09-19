import { HomePage } from "@/features/home/home-page";
import { HomeSkeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomePage />
    </Suspense>
  );
}
