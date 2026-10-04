import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { InstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";
import { InstructorCourseOverviewTab } from "@/features/instructor/instructor-course-overview-tab";

interface CourseOverviewPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = createPrivatePageMetadata("Tổng quan khóa học");

export default async function Page({ params }: CourseOverviewPageProps) {
  const { id } = await params;
  return (
    <InstructorCourseWorkspace courseId={id} activeTab="overview">
      <InstructorCourseOverviewTab />
    </InstructorCourseWorkspace>
  );
}
