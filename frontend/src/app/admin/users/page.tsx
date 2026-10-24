import type { Metadata } from "next";
import { AdminUsersPage } from "@/features/admin/admin-users-page";

export const metadata: Metadata = {
  title: "Quản lý người dùng & giảng viên | EduAlto Admin",
  description: "Quản lý tài khoản và quyền hạn thành viên EduAlto",
};

export default function AdminUsersRoute() {
  return <AdminUsersPage />;
}
