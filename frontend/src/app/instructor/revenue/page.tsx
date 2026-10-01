import { InstructorRevenuePage } from "@/features/instructor/instructor-revenue-page";
import { InstructorWorkspaceShell } from "@/features/instructor/instructor-workspace-shell";

export default function Page() {
  return (
    <InstructorWorkspaceShell activeSection="revenue">
      <InstructorRevenuePage />
    </InstructorWorkspaceShell>
  );
}
