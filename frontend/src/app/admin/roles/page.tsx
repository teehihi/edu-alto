import type { Metadata } from "next";
import { AdminRolesPage } from "@/features/admin/admin-roles-page";

export const metadata: Metadata = {
  title: "Vai trò & Phân quyền hệ thống | EduAlto Admin",
  description: "Quản lý vai trò người dùng và cấu hình phân quyền truy cập API hệ thống (RBAC)",
};

export default function AdminRolesRoute() {
  return <AdminRolesPage />;
}
