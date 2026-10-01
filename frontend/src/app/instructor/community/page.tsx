import InstructorCommunityPage from "@/features/instructor/instructor-community-page";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";

export default function Page() {
  return (
    <InstructorWorkspaceShell activeSection="community">
      <InstructorCommunityPage />
    </InstructorWorkspaceShell>
  );
}
