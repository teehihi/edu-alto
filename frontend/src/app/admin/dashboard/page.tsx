import type { Metadata } from "next";
import { AdminDashboardPage } from "@/features/admin/admin-dashboard-page";

export const metadata: Metadata = {
  title: "Tổng quan quản trị | EduAlto",
  description: "Bảng điều khiển và báo cáo thống kê EduAlto",
};

export default function AdminDashboardRoute() {
  return <AdminDashboardPage />;
}
