import { LearningPortal } from "@/features/learning/learning-portal";

export const instant = false;

export const metadata = { title: "Khóa học của tôi" };

export default function MyCoursesPage() {
  return <LearningPortal view="courses" />;
}
