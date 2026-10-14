"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bell, Megaphone } from "lucide-react";
import { useStudentNotifications } from "@/features/notification/use-student-notifications";
import { useAuthSession } from "@/lib/auth-session";
import { StudentNotificationFeed } from "@/features/notification/student-notification-feed";
import { useStudentNotificationReadState } from "@/features/notification/use-student-notification-read-state";

export function StudentNotificationsView() {
  const { user, isLoading: sessionLoading } = useAuthSession();
  const router = useRouter();
  const { items, loaded, error } = useStudentNotifications();
  const { isRead, markRead } = useStudentNotificationReadState(items);

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent("/learning/notifications")}`);
    }
  }, [router, sessionLoading, user]);

  if (sessionLoading || !user) {
    return (
      <p className="py-8 text-center text-sm text-muted" role="status">
        Đang mở thông báo…
      </p>
    );
  }

  if (!user.roles.includes("STUDENT")) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-muted">
        Thông báo này chỉ dành cho học viên.
      </p>
    );
  }

  return (
    <section aria-label="Thông báo học tập">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-primary">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-heading">Thông báo</h1>
          <p className="mt-0.5 text-sm text-muted">Thông báo khóa học và phản hồi đánh giá</p>
        </div>
      </header>

      {error && !loaded ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {!loaded && !error ? (
        <p className="py-8 text-center text-sm text-muted" role="status">
          Đang cập nhật thông báo…
        </p>
      ) : null}
      {loaded && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-heading">Chưa có thông báo mới</h2>
          <p className="mt-1 text-sm text-muted">
            Thông báo khóa học và phản hồi mới sẽ hiển thị tại đây.
          </p>
        </div>
      ) : null}
      {items.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-3">
          <StudentNotificationFeed items={items} isRead={isRead} onRead={markRead} />
        </div>
      ) : null}
    </section>
  );
}
