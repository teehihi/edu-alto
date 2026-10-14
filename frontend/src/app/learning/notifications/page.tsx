import { LearningWorkspaceShell } from "@/features/learning/learning-workspace-shell";
import { StudentNotificationsView } from "@/features/notification/student-notifications-view";

export const metadata = {
  title: "Thông báo | Không gian học tập",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <LearningWorkspaceShell title="Thông báo">
      <main className="container-page min-h-[calc(100vh-2rem)] py-8 md:py-10">
        <StudentNotificationsView />
      </main>
    </LearningWorkspaceShell>
  );
}
