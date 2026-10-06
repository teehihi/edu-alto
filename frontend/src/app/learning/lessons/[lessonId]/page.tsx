export const instant = false;
import { Suspense } from "react";
import { LearningLessonPage } from "@/features/learning/learning-lesson-page";
import { LessonSkeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Bài học" };

export default async function LearningLessonRoute({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  return (
    <Suspense fallback={<LessonSkeleton />}>
      <LearningLessonPage lessonId={lessonId} />
    </Suspense>
  );
}
