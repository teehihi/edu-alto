import { Suspense } from "react";
import { LearningPortal } from "@/features/learning/learning-portal";

export const metadata = { title: "Thời khóa biểu" };

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <LearningPortal view="calendar" />
    </Suspense>
  );
}
