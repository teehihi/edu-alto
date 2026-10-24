import type { Metadata } from "next";
import { AdminAnalyticsPage } from "@/features/admin/admin-analytics-page";

export const metadata: Metadata = {
  title: "Báo cáo & Thống kê | EduAlto Admin",
  description: "Báo cáo doanh thu và phân tích hiệu quả đào tạo EduAlto",
};

export default function AdminAnalyticsRoute() {
  return <AdminAnalyticsPage />;
}
