import type { Metadata } from "next";
import { CourseDetailPage } from "@/features/course/course-detail-page";
import { fetchPublicCourseBySlug } from "@/lib/course-client";
import { courseDescriptionToText } from "@/lib/course-description";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const course = await fetchPublicCourseBySlug(slug);
    const description = courseDescriptionToText(course.description).slice(0, 160);
    return {
      title: `${course.title} | EduAlto`,
      description:
        course.tagline || description || "Khám phá khóa học chất lượng cao trên EduAlto.",
      openGraph: {
        title: course.title,
        description: course.tagline || description,
        images: course.thumbnailUrl ? [{ url: course.thumbnailUrl }] : undefined,
      },
    };
  } catch {
    return {
      title: "Chi tiết khóa học | EduAlto",
    };
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CourseDetailPage key={slug} slug={slug} />;
}
