import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { InstructorDashboardPage } from "@/features/instructor/instructor-dashboard-page";

export const metadata = createPrivatePageMetadata("Bảng điều khiển");

export default function Page() {
  return <InstructorDashboardPage />;
}
