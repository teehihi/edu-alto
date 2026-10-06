import { createPrivatePageMetadata } from "@/lib/page-metadata";
import { InstructorRevenuePage } from "@/features/instructor/instructor-revenue-page";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";

export const instant = false;

export const metadata = createPrivatePageMetadata("Doanh thu");

export default function Page() {
  return (
    <InstructorWorkspaceShell activeSection="revenue">
      <InstructorRevenuePage />
    </InstructorWorkspaceShell>
  );
}
