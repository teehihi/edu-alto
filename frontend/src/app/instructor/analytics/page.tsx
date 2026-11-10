import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { InstructorAnalyticsPage } from "@/features/instructor/instructor-analytics-page";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";

export const instant = false;

export const metadata = createPrivatePageMetadata("Phân tích số liệu học tập và doanh thu");

export default function Page() {
  return (
    <InstructorWorkspaceShell activeSection="analytics">
      <InstructorAnalyticsPage />
    </InstructorWorkspaceShell>
  );
}
