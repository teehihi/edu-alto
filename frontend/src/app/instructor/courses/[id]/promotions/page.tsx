import { InstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";
import { InstructorCoursePromotionsPage } from "@/features/instructor/instructor-course-promotions-page";

interface CoursePromotionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: CoursePromotionsPageProps) {
  const { id } = await params;
  return (
    <InstructorCourseWorkspace courseId={id} activeTab="promotions">
      <InstructorCoursePromotionsPage />
    </InstructorCourseWorkspace>
  );
}
