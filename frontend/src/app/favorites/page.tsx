import { FavoriteCoursesPage } from "@/features/course/favorite-courses-page";

export const metadata = {
  title: "Khóa học yêu thích",
  description: "Xem lại những khóa học bạn đã lưu trên EduAlto.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FavoriteCoursesPage />;
}
