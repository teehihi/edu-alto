import { CourseCertificatePage } from "@/features/learning/course-certificate-page";

export const metadata = { title: "Chứng nhận hoàn thành | EduAlto" };

export default async function CourseCertificateRoute({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseCertificatePage courseId={courseId} />;
}
