import { Suspense } from "react";
import { LearningPortal } from "@/features/learning/learning-portal";
import { CalendarSkeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Thời khóa biểu" };

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-8">
          <CalendarSkeleton />
        </div>
      }
    >
      <LearningPortal view="calendar" />
    </Suspense>
  );
}
