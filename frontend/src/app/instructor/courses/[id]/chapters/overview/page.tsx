export const instant = false;
import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { CourseCurriculumSkeleton } from "@/components/ui/skeleton";
import { InstructorCourseCurriculumPage } from "@/features/instructor/instructor-course-curriculum-page";
import { InstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";

interface CourseChapterOverviewPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = createPrivatePageMetadata("Tổng quan giáo trình");

export default async function Page({ params }: CourseChapterOverviewPageProps) {
  const { id } = await params;
  return (
    <InstructorCourseWorkspace courseId={id} activeTab="chapters">
      <Suspense fallback={<CourseCurriculumSkeleton />}>
        <InstructorCourseCurriculumPage courseId={id} embedded />
      </Suspense>
    </InstructorCourseWorkspace>
  );
}
