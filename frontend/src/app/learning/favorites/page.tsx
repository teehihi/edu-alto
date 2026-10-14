import { FavoriteCoursesPage } from "@/features/course/favorite-courses-page";

export const metadata = {
  title: "Khóa học yêu thích | Không gian học tập",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FavoriteCoursesPage inLearningSpace />;
}
