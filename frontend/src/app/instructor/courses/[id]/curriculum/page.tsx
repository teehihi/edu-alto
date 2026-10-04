import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { Suspense } from "react";
import { InstructorCourseCurriculumPage } from "@/features/instructor/instructor-course-curriculum-page";
import { CourseCurriculumSkeleton } from "@/components/ui/skeleton";
import { InstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";

interface CurriculumPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = createPrivatePageMetadata("Quản lý giáo trình");

export default async function Page({ params }: CurriculumPageProps) {
  const resolvedParams = await params;
  return (
    <InstructorCourseWorkspace courseId={resolvedParams.id} activeTab="chapters">
      <Suspense fallback={<CourseCurriculumSkeleton />}>
        <InstructorCourseCurriculumPage courseId={resolvedParams.id} embedded />
      </Suspense>
    </InstructorCourseWorkspace>
  );
}
