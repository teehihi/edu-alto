export const instant = false;
import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { InstructorCourseStudentsTab } from "@/features/instructor/instructor-course-students-tab";
import { InstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";

interface CourseStudentsPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = createPrivatePageMetadata("Học viên khóa học");

export default async function Page({ params }: CourseStudentsPageProps) {
  const { id } = await params;
  return (
    <InstructorCourseWorkspace courseId={id} activeTab="students">
      <InstructorCourseStudentsTab />
    </InstructorCourseWorkspace>
  );
}
