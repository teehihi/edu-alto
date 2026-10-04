import { CourseDetailPage } from "@/features/course/course-detail-page";

export const metadata = { title: "Chi tiết khóa học" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CourseDetailPage key={slug} slug={slug} />;
}
