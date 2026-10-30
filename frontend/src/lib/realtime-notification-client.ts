import { apiRequest } from "@/lib/api";

export type RealtimeNotificationType =
  | "DISCUSSION_REPLY"
  | "NEW_ENROLLMENT"
  | "ANNOUNCEMENT"
  | "REVIEW_REPLY"
  | "SYSTEM";

export type RealtimeNotification = {
  id: string;
  recipientId: string;
  type: RealtimeNotificationType;
  title: string;
  message: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type RealtimeNotificationSummary = {
  items: RealtimeNotification[];
  unreadCount: number;
  totalElements: number;
};

export function fetchRealtimeNotifications(
  accessToken: string,
  page = 0,
  size = 20,
): Promise<RealtimeNotificationSummary> {
  return apiRequest<RealtimeNotificationSummary>(
    `/me/realtime-notifications?page=${page}&size=${size}`,
    { accessToken },
  );
}

export function markRealtimeNotificationAsRead(
  id: string,
  accessToken: string,
): Promise<RealtimeNotification> {
  return apiRequest<RealtimeNotification>(
    `/me/realtime-notifications/${encodeURIComponent(id)}/read`,
    {
      method: "POST",
      accessToken,
    },
  );
}

export function markAllRealtimeNotificationsAsRead(accessToken: string): Promise<number> {
  return apiRequest<number>("/me/realtime-notifications/read-all", {
    method: "POST",
    accessToken,
  });
}

function resolveWsUrl(token: string): string {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) {
    return `${envUrl}?token=${encodeURIComponent(token)}`;
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    const wsPrefix = apiUrl.startsWith("https:") ? "wss:" : "ws:";
    const cleanHost = apiUrl.replace(/^https?:\/\//, "").replace(/\/api\/v1\/?$/, "");
    return `${wsPrefix}//${cleanHost}/ws?token=${encodeURIComponent(token)}`;
  }
  if (typeof window !== "undefined") {
    const wsPrefix = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${wsPrefix}//${window.location.hostname}:8080/ws?token=${encodeURIComponent(token)}`;
  }
  return `ws://localhost:8080/ws?token=${encodeURIComponent(token)}`;
}

export interface StompSubscription {
  unsubscribe: () => void;
}

export function connectRealtimeNotifications(options: {
  token: string;
  userId: string;
  onNotification: (notification: RealtimeNotification) => void;
  onConnected?: () => void;
  onError?: (err: Error) => void;
}): () => void {
  const { token, userId, onNotification, onConnected, onError } = options;
  let socket: WebSocket | null = null;
  let heartbeatInterval: number | null = null;
  let reconnectTimeout: number | null = null;
  let isClosedManually = false;
  let reconnectAttempts = 0;

  function connect() {
    if (isClosedManually) return;

    try {
      const url = resolveWsUrl(token);
      socket = new WebSocket(url);
    } catch (err) {
      if (onError && err instanceof Error) onError(err);
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      reconnectAttempts = 0;
      // Send STOMP CONNECT frame
      const connectFrame =
        [
          "CONNECT",
          "accept-version:1.2,1.1,1.0",
          "heart-beat:10000,10000",
          `Authorization:Bearer ${token}`,
          "\n",
        ].join("\n") + "\0";

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(connectFrame);
      }
    };

    socket.onmessage = (event) => {
      const raw = typeof event.data === "string" ? event.data : "";
      if (!raw || raw === "\n" || raw === "\r\n") {
        // Heartbeat ping from server
        return;
      }

      // Parse STOMP frames (might contain multiple frames separated by \0)
      const frames = raw.split("\0");
      for (const frame of frames) {
        const trimmed = frame.trim();
        if (!trimmed) continue;

        const lines = trimmed.split("\n");
        const command = lines[0].trim();

        if (command === "CONNECTED") {
          onConnected?.();

          // Subscribe to user queue and direct topic
          const subQueue =
            ["SUBSCRIBE", "id:sub-user-queue", "destination:/user/queue/notifications", "\n"].join(
              "\n",
            ) + "\0";

          const subTopic =
            [
              "SUBSCRIBE",
              `id:sub-topic-${userId}`,
              `destination:/topic/notifications/${userId}`,
              "\n",
            ].join("\n") + "\0";

          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(subQueue);
            socket.send(subTopic);
          }

          // Start client heartbeat
          heartbeatInterval = window.setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send("\n");
            }
          }, 10000);
        } else if (command === "MESSAGE") {
          // Find blank line separating headers and body
          const emptyLineIndex = lines.findIndex((l, idx) => idx > 0 && l.trim() === "");
          if (emptyLineIndex !== -1) {
            const body = lines
              .slice(emptyLineIndex + 1)
              .join("\n")
              .trim();
            try {
              const notification = JSON.parse(body) as RealtimeNotification;
              onNotification(notification);
            } catch {
              // Ignore non-json payload
            }
          }
        }
      }
    };

    socket.onerror = () => {
      // Reconnect will be handled in onclose
    };

    socket.onclose = () => {
      if (heartbeatInterval) {
        window.clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (!isClosedManually) {
        scheduleReconnect();
      }
    };
  }

  function scheduleReconnect() {
    if (isClosedManually) return;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 15000);
    reconnectAttempts++;
    reconnectTimeout = window.setTimeout(() => {
      connect();
    }, delay);
  }

  connect();

  return () => {
    isClosedManually = true;
    if (heartbeatInterval) {
      window.clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    if (reconnectTimeout) {
      window.clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (socket) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send("DISCONNECT\n\n\0");
        } catch {
          // ignore
        }
      }
      socket.close();
      socket = null;
    }
  };
}
