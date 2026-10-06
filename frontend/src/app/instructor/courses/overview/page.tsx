import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { InstructorCourseListPage } from "@/features/instructor/instructor-course-list-page";

export const instant = false;

export const metadata = createPrivatePageMetadata("Khóa học của tôi");

export default function Page() {
  return <InstructorCourseListPage />;
}
