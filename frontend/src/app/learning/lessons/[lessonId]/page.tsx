import { Suspense } from "react";
import { LearningLessonPage } from "@/features/learning/learning-lesson-page";

export const metadata = { title: "Bài học" };

export default async function LearningLessonRoute({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  return (
    <Suspense
      fallback={<div className="container-page py-16 text-sm text-muted">Đang tải bài học…</div>}
    >
      <LearningLessonPage lessonId={lessonId} />
    </Suspense>
  );
}
