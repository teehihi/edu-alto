import type { Metadata } from "next";
import { AdminCoursesPage } from "@/features/admin/admin-courses-page";

export const metadata: Metadata = {
  title: "Quản lý khóa học | EduAlto Admin",
  description: "Kiểm duyệt và quản trị danh mục khóa học EduAlto",
};

export default function AdminCoursesRoute() {
  return <AdminCoursesPage />;
}
