import { LearningPortal } from "@/features/learning/learning-portal";

export const metadata = { title: "Bài học đã lưu" };

export default function SavedLessonsPage() {
  return <LearningPortal view="savedLessons" />;
}
