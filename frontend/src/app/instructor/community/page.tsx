import { createPrivatePageMetadata } from "@/lib/page-metadata";
import InstructorCommunityPage from "@/features/instructor/instructor-community-page";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";

export const instant = false;

export const metadata = createPrivatePageMetadata("Cộng đồng lớp học");

export default function Page() {
  return (
    <InstructorWorkspaceShell activeSection="community">
      <InstructorCommunityPage />
    </InstructorWorkspaceShell>
  );
}
