"use client";

import { useEffect, useRef, useState } from "react";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import {
  fetchStudentNotifications,
  type StudentNotification,
} from "@/lib/student-notification-client";

const REFRESH_INTERVAL_MS = 15_000;

function notificationsMatch(first: StudentNotification[], second: StudentNotification[]) {
  return (
    first.length === second.length &&
    first.every((item, index) => {
      const next = second[index];
      return (
        item.id === next.id &&
        item.type === next.type &&
        item.createdAt === next.createdAt &&
        item.description === next.description &&
        item.title === next.title &&
        item.instructorName === next.instructorName &&
        item.instructorAvatarUrl === next.instructorAvatarUrl &&
        item.linkUrl === next.linkUrl &&
        item.imageUrl === next.imageUrl
      );
    })
  );
}

export function useStudentNotifications(enabled = true) {
  const { user, isAuthenticated, getAccessToken } = useAuthSession();
  const isStudent = user?.roles.includes("STUDENT") ?? false;
  const userId = user?.id;
  const [items, setItems] = useState<StudentNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const loadedRef = useRef(false);
  const previousUserIdRef = useRef(userId);

  useEffect(() => {
    if (previousUserIdRef.current !== userId) {
      previousUserIdRef.current = userId;
      loadedRef.current = false;
      setItems([]);
      setLoaded(false);
      setError("");
    }
  }, [userId]);

  useEffect(() => {
    if (!enabled || !isAuthenticated || !isStudent) return;
    let active = true;
    let requestInFlight = false;

    const refresh = async () => {
      if (!active || requestInFlight || document.visibilityState === "hidden") return;
      requestInFlight = true;
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        const result = await fetchStudentNotifications(token);
        if (!active) return;
        setItems((current) => (notificationsMatch(current, result.data) ? current : result.data));
        loadedRef.current = true;
        setLoaded(true);
        setError("");
      } catch (loadError) {
        if (!active || loadedRef.current) return;
        setError(
          loadError instanceof ApiClientError
            ? loadError.message
            : loadError instanceof Error
              ? loadError.message
              : "Không thể tải thông báo.",
        );
      } finally {
        requestInFlight = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [enabled, getAccessToken, isAuthenticated, isStudent, userId]);

  return { items, loaded, error };
}
