"use client";

import { StudentNotificationRow } from "@/features/notification/student-notification-row";
import type { StudentNotification } from "@/lib/student-notification-client";

export function StudentNotificationFeed({
  items,
  isRead,
  onRead,
}: {
  items: StudentNotification[];
  isRead: (item: StudentNotification) => boolean;
  onRead: (item: StudentNotification) => void;
}) {
  const newItems = items.filter((item) => !isRead(item));
  const previousItems = items.filter(isRead);

  return (
    <div className="space-y-3">
      {newItems.length > 0 ? (
        <section aria-label="Thông báo mới">
          <h3 className="px-3 pb-1 pt-2 text-sm font-semibold text-heading">Mới</h3>
          <ul className="space-y-1">
            {newItems.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <StudentNotificationRow item={item} isRead={false} onRead={() => onRead(item)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {previousItems.length > 0 ? (
        <section aria-label="Thông báo trước đó">
          <h3 className="px-3 pb-1 pt-2 text-sm font-semibold text-heading">Trước đó</h3>
          <ul className="space-y-1">
            {previousItems.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <StudentNotificationRow item={item} isRead onRead={() => onRead(item)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
