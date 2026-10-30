"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Megaphone, MoreHorizontal, Radio } from "lucide-react";
import { useAuthSession } from "@/lib/auth-session";
import { useStudentNotifications } from "@/features/notification/use-student-notifications";
import { StudentNotificationFeed } from "@/features/notification/student-notification-feed";
import { useStudentNotificationReadState } from "@/features/notification/use-student-notification-read-state";
import { useRealtimeNotifications } from "@/features/notification/use-realtime-notifications";
import { RealtimeNotificationRow } from "@/features/notification/realtime-notification-row";

export function StudentAnnouncementBell() {
  const { user, isAuthenticated } = useAuthSession();
  const [open, setOpen] = useState(false);
  const isStudent = user?.roles?.includes("STUDENT") ?? false;
  const isInstructor = user?.roles?.includes("INSTRUCTOR") ?? false;

  const {
    items: announcementItems,
    loaded: announcementsLoaded,
    error: announcementsError,
  } = useStudentNotifications(isStudent);
  const {
    unreadCount: announcementUnreadCount,
    isRead: isAnnouncementRead,
    markRead: markAnnouncementRead,
    markAllRead: markAllAnnouncementsRead,
  } = useStudentNotificationReadState(announcementItems);

  const {
    items: realtimeItems,
    unreadCount: realtimeUnreadCount,
    loaded: realtimeLoaded,
    isConnected,
    markRead: markRealtimeRead,
    markAllRead: markAllRealtimeRead,
  } = useRealtimeNotifications(isAuthenticated);

  const rootRef = useRef<HTMLDivElement>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
        setActionsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActionsOpen(false);
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!isAuthenticated || (!isStudent && !isInstructor)) return null;

  const totalUnread = (isStudent ? announcementUnreadCount : 0) + realtimeUnreadCount;
  const totalItemsCount = (isStudent ? announcementItems.length : 0) + realtimeItems.length;
  const isFullyLoaded = (isStudent ? announcementsLoaded : true) && realtimeLoaded;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setActionsOpen(false);
        }}
        aria-label={totalUnread > 0 ? `Thông báo, ${totalUnread} chưa xem` : "Thông báo"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`focus-ring relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
          open ? "bg-[#EAF7F3] text-primary" : "text-slate-700 hover:bg-slate-50 hover:text-primary"
        }`}
      >
        <Bell className="h-[21px] w-[21px] stroke-[1.8]" aria-hidden="true" />
        {totalUnread > 0 ? (
          <span
            className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white"
            aria-hidden="true"
          />
        ) : null}
      </button>
      {open ? (
        <section
          role="dialog"
          aria-label="Thông báo"
          className="absolute right-0 top-full z-[80] mt-3 max-h-[min(75vh,600px)] w-[min(92vw,440px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-heading">Thông báo</h2>
              {isConnected ? (
                <span
                  title="Đang kết nối thời gian thực"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                >
                  <Radio className="h-3 w-3 animate-pulse text-primary" />
                  Trực tiếp
                </span>
              ) : null}
            </div>
            <div className="relative">
              <button
                type="button"
                aria-label="Tùy chọn thông báo"
                aria-expanded={actionsOpen}
                onClick={() => setActionsOpen((current) => !current)}
                className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-heading"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
              {actionsOpen ? (
                <div className="absolute right-0 top-full z-10 mt-1 min-w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    disabled={totalUnread === 0}
                    onClick={() => {
                      if (isStudent) markAllAnnouncementsRead();
                      void markAllRealtimeRead();
                      setActionsOpen(false);
                    }}
                    className="focus-ring w-full rounded-md px-3 py-2 text-left text-sm font-medium text-heading transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                  >
                    Đánh dấu tất cả đã đọc
                  </button>
                </div>
              ) : null}
            </div>
          </header>
          <div className="max-h-[min(65vh,500px)] overflow-y-auto">
            {!isFullyLoaded ? (
              <p className="p-4 text-sm text-muted" role="status">
                Đang cập nhật thông báo…
              </p>
            ) : null}
            {isStudent && announcementsError && !announcementsLoaded ? (
              <div className="p-4 text-sm text-rose-700" role="alert">
                {announcementsError}
                <span className="mt-1 block text-xs">Hệ thống sẽ tự thử tải lại.</span>
              </div>
            ) : null}

            {/* Realtime push notifications section */}
            {realtimeItems.length > 0 ? (
              <div className="p-2 border-b border-slate-100">
                <h3 className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Thông báo tức thời
                </h3>
                <ul className="space-y-1">
                  {realtimeItems.map((item) => (
                    <li key={item.id}>
                      <RealtimeNotificationRow
                        item={item}
                        onRead={() => {
                          void markRealtimeRead(item.id);
                          if (item.linkUrl) setOpen(false);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Student announcement feeds */}
            {isStudent && announcementItems.length > 0 ? (
              <div className="p-2">
                <StudentNotificationFeed
                  items={announcementItems}
                  isRead={isAnnouncementRead}
                  onRead={(item) => {
                    markAnnouncementRead(item);
                    if (item.linkUrl) setOpen(false);
                  }}
                />
              </div>
            ) : null}

            {isFullyLoaded && totalItemsCount === 0 ? (
              <div className="px-5 py-10 text-center">
                <Megaphone className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-heading">Chưa có thông báo mới</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Thông báo hỏi đáp và hoạt động khóa học sẽ hiển thị tại đây.
                </p>
              </div>
            ) : null}
          </div>
          {isStudent ? (
            <footer className="border-t border-slate-100 px-4 py-2.5 text-right">
              <Link
                href="/learning/notifications"
                onClick={() => setOpen(false)}
                className="focus-ring rounded text-xs font-semibold text-primary hover:underline"
              >
                Xem tất cả thông báo
              </Link>
            </footer>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
