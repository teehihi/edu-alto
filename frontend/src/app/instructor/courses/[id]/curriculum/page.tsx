import { Suspense } from "react";
import { InstructorCourseCurriculumPage } from "@/features/instructor/instructor-course-curriculum-page";
import { CourseCurriculumSkeleton } from "@/components/ui/skeleton";

interface CurriculumPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: CurriculumPageProps) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<CourseCurriculumSkeleton />}>
      <InstructorCourseCurriculumPage courseId={resolvedParams.id} />
    </Suspense>
  );
}
