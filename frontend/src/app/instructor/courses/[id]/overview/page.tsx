import { InstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";
import { InstructorCourseOverviewTab } from "@/features/instructor/instructor-course-overview-tab";

interface CourseOverviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: CourseOverviewPageProps) {
  const { id } = await params;
  return (
    <InstructorCourseWorkspace courseId={id} activeTab="overview">
      <InstructorCourseOverviewTab />
    </InstructorCourseWorkspace>
  );
}
