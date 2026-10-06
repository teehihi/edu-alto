import type { Metadata } from "next";
import { CourseDetailPage } from "@/features/course/course-detail-page";
import { fetchPublicCourseBySlug } from "@/lib/course-client";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const course = await fetchPublicCourseBySlug(slug);
    return {
      title: `${course.title} | EduAlto`,
      description:
        course.tagline ||
        course.description?.slice(0, 160) ||
        "Khám phá khóa học chất lượng cao trên EduAlto.",
      openGraph: {
        title: course.title,
        description: course.tagline || course.description?.slice(0, 160),
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
