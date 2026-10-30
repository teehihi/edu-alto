"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "@/lib/auth-session";
import {
  connectRealtimeNotifications,
  fetchRealtimeNotifications,
  markAllRealtimeNotificationsAsRead,
  markRealtimeNotificationAsRead,
  type RealtimeNotification,
} from "@/lib/realtime-notification-client";

export function useRealtimeNotifications(enabled = true) {
  const { user, isAuthenticated, getAccessToken } = useAuthSession();
  const userId = user?.id;

  const [items, setItems] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial notifications via REST API
  const refresh = useCallback(async () => {
    if (!isAuthenticated || !userId) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const data = await fetchRealtimeNotifications(token, 0, 30);
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      setLoaded(true);
      setError(null);
    } catch {
      // Keep loaded state or set error
      setLoaded(true);
    }
  }, [getAccessToken, isAuthenticated, userId]);

  const isActive = Boolean(enabled && isAuthenticated && userId);

  useEffect(() => {
    if (!isActive) return;

    void refresh();

    let disconnectWs: (() => void) | null = null;

    const setupWebSocket = async () => {
      try {
        const token = await getAccessToken();
        if (!token || !userId) return;

        disconnectWs = connectRealtimeNotifications({
          token,
          userId,
          onNotification: (notification) => {
            setItems((prev) => {
              // Avoid duplicates
              if (prev.some((item) => item.id === notification.id)) {
                return prev;
              }
              return [notification, ...prev];
            });
            setUnreadCount((prev) => prev + 1);
          },
          onConnected: () => {
            setIsConnected(true);
          },
          onError: () => {
            setIsConnected(false);
          },
        });
      } catch {
        // Fallback to polling if token refresh fails
      }
    };

    void setupWebSocket();

    return () => {
      if (disconnectWs) {
        disconnectWs();
      }
      setIsConnected(false);
    };
  }, [getAccessToken, isActive, refresh, userId]);

  const markRead = useCallback(
    async (notificationId: string) => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        await markRealtimeNotificationAsRead(notificationId, token);
        setItems((prev) =>
          prev.map((item) =>
            item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Safe ignore
      }
    },
    [getAccessToken],
  );

  const markAllRead = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await markAllRealtimeNotificationsAsRead(token);
      setItems((prev) => prev.map((item) => ({ ...item, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // Safe ignore
    }
  }, [getAccessToken]);

  return {
    items: isActive ? items : [],
    unreadCount: isActive ? unreadCount : 0,
    loaded: isActive ? loaded : false,
    isConnected: isActive ? isConnected : false,
    error: isActive ? error : null,
    refresh,
    markRead,
    markAllRead,
  };
}
