export const instant = false;
import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { InstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";
import { InstructorCoursePromotionsPage } from "@/features/instructor/instructor-course-promotions-page";

interface CoursePromotionsPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = createPrivatePageMetadata("Mã khuyến mãi");

export default async function Page({ params }: CoursePromotionsPageProps) {
  const { id } = await params;
  return (
    <InstructorCourseWorkspace courseId={id} activeTab="promotions">
      <InstructorCoursePromotionsPage />
    </InstructorCourseWorkspace>
  );
}
