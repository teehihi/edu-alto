import { LearningCoursePage } from "@/features/learning/learning-course-page";

export const metadata = { title: "Giáo trình của tôi | EduAlto" };

export default async function LearningCourseRoute({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <LearningCoursePage courseId={courseId} />;
}
