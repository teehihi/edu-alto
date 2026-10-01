import { InstructorCourseDetailsTab } from "@/features/instructor/instructor-course-details-tab";
import { InstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";

interface CourseDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: CourseDetailsPageProps) {
  const { id } = await params;
  return (
    <InstructorCourseWorkspace courseId={id} activeTab="details">
      <InstructorCourseDetailsTab />
    </InstructorCourseWorkspace>
  );
}
