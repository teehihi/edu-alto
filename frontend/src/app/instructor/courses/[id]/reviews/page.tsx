import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { InstructorCourseReviewsTab } from "@/features/instructor/instructor-course-reviews-tab";
import { InstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";

interface CourseReviewsPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = createPrivatePageMetadata("Đánh giá khóa học");

export default async function Page({ params }: CourseReviewsPageProps) {
  const { id } = await params;
  return (
    <InstructorCourseWorkspace courseId={id} activeTab="reviews">
      <InstructorCourseReviewsTab />
    </InstructorCourseWorkspace>
  );
}
