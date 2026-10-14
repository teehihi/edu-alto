"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useAuthSession } from "@/lib/auth-session";
import type { StudentNotification } from "@/lib/student-notification-client";

const STORAGE_PREFIX = "edualto:read-student-notifications:";
const READ_STATE_EVENT = "edualto:student-notifications-read-changed";
const MAX_STORED_IDS = 500;
const EMPTY_READ_IDS: ReadonlySet<string> = new Set();
const snapshotsByUser = new Map<
  string,
  { storedValue: string | null; readIds: ReadonlySet<string> }
>();

function getNotificationKey(item: StudentNotification) {
  return `${item.type}:${item.id}`;
}

function getServerSnapshot() {
  return EMPTY_READ_IDS;
}

function readSnapshot(userId: string | undefined): ReadonlySet<string> {
  if (!userId || typeof window === "undefined") return EMPTY_READ_IDS;

  const cached = snapshotsByUser.get(userId);
  try {
    const storedValue = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (cached?.storedValue === storedValue) return cached.readIds;

    let parsed: unknown = [];
    try {
      parsed = storedValue ? JSON.parse(storedValue) : [];
    } catch {
      // Discard invalid stored data while allowing new notifications to be read.
    }
    const readIds = new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string").slice(-MAX_STORED_IDS)
        : [],
    );
    snapshotsByUser.set(userId, { storedValue, readIds });
    return readIds;
  } catch {
    return cached?.readIds ?? EMPTY_READ_IDS;
  }
}

function subscribe(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(STORAGE_PREFIX)) onChange();
  };
  window.addEventListener(READ_STATE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(READ_STATE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function saveReadIds(userId: string, keys: string[]) {
  const current = readSnapshot(userId);
  const next = new Set(current);
  keys.forEach((key) => next.add(key));
  if (next.size === current.size) return;

  const readIds = new Set(Array.from(next).slice(-MAX_STORED_IDS));
  let storedValue = snapshotsByUser.get(userId)?.storedValue ?? null;
  try {
    const serialized = JSON.stringify(Array.from(readIds));
    window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, serialized);
    storedValue = serialized;
  } catch {
    // Share the in-memory state when browser storage is unavailable.
  }
  snapshotsByUser.set(userId, { storedValue, readIds });
  window.dispatchEvent(new Event(READ_STATE_EVENT));
}

export function useStudentNotificationReadState(items: StudentNotification[]) {
  const { user } = useAuthSession();
  const userId = user?.id;
  const getSnapshot = useCallback(() => readSnapshot(userId), [userId]);
  const readIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const markRead = useCallback(
    (item: StudentNotification) => {
      if (userId) saveReadIds(userId, [getNotificationKey(item)]);
    },
    [userId],
  );

  const markAllRead = useCallback(() => {
    if (userId) saveReadIds(userId, items.map(getNotificationKey));
  }, [items, userId]);

  return {
    unreadCount: userId
      ? items.reduce((count, item) => count + (readIds.has(getNotificationKey(item)) ? 0 : 1), 0)
      : 0,
    isRead: (item: StudentNotification) => !userId || readIds.has(getNotificationKey(item)),
    markRead,
    markAllRead,
  };
}
