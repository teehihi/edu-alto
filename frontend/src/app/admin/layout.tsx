import type { Metadata } from "next";
import { AdminWorkspaceShell } from "@/features/admin/admin-workspace-shell";

export const metadata: Metadata = {
  title: "Quản trị hệ thống | EduAlto",
  description: "Trung tâm quản trị và điều hành nền tảng học tập trực tuyến EduAlto",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminWorkspaceShell>{children}</AdminWorkspaceShell>;
}
