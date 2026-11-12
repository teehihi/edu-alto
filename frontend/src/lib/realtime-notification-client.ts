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

export type WsTicketResponse = {
  ticket: string;
  expiresInSeconds: number;
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

export function fetchWsTicket(accessToken: string): Promise<WsTicketResponse> {
  return apiRequest<WsTicketResponse>("/ws/ticket", {
    method: "POST",
    accessToken,
  });
}

export function resolveWsUrl(ticket: string): string {
  const encodedTicket = encodeURIComponent(ticket);
  const envUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (envUrl) {
    const normalized = envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
    const separator = normalized.includes("?") ? "&" : "?";
    return `${normalized}${separator}ticket=${encodedTicket}`;
  }
  const apiUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL)?.trim();
  if (apiUrl) {
    const wsPrefix = apiUrl.startsWith("https:") ? "wss:" : "ws:";
    const cleanHost = apiUrl.replace(/^https?:\/\//, "").replace(/\/api\/v1\/?$/, "");
    return `${wsPrefix}//${cleanHost}/ws?ticket=${encodedTicket}`;
  }
  if (typeof window !== "undefined") {
    const wsPrefix = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${wsPrefix}//${window.location.hostname}:8080/ws?ticket=${encodedTicket}`;
  }
  return `ws://localhost:8080/ws?ticket=${encodedTicket}`;
}

export interface StompSubscription {
  unsubscribe: () => void;
}

export function connectRealtimeNotifications(options: {
  getAccessToken?: () => Promise<string | null>;
  token?: string;
  userId?: string;
  onNotification: (notification: RealtimeNotification) => void;
  onConnected?: () => void;
  onError?: (err: Error) => void;
}): () => void {
  const { getAccessToken, token, onNotification, onConnected, onError } = options;
  let socket: WebSocket | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let isClosedManually = false;
  let reconnectAttempts = 0;

  async function resolveAccessToken(): Promise<string | null> {
    if (getAccessToken) {
      return getAccessToken();
    }
    return token ?? null;
  }

  async function connect() {
    if (isClosedManually) return;

    let accessToken: string | null = null;
    let ticketResponse: WsTicketResponse;
    try {
      accessToken = await resolveAccessToken();
      if (isClosedManually) return;
      if (!accessToken) {
        onError?.(new Error("Không có phiên đăng nhập hợp lệ để kết nối thông báo"));
        scheduleReconnect();
        return;
      }
      ticketResponse = await fetchWsTicket(accessToken);
      if (isClosedManually) return;
      const url = resolveWsUrl(ticketResponse.ticket);
      socket = new WebSocket(url);
    } catch (err) {
      if (isClosedManually) return;
      onError?.(err instanceof Error ? err : new Error("Không thể khởi tạo kết nối WebSocket"));
      scheduleReconnect();
      return;
    }

    const activeSocket = socket;

    activeSocket.onopen = () => {
      if (isClosedManually || socket !== activeSocket) {
        return;
      }
      reconnectAttempts = 0;
      const connectFrame =
        [
          "CONNECT",
          "accept-version:1.2,1.1,1.0",
          "heart-beat:10000,10000",
          `Authorization:Bearer ${accessToken}`,
          "\n",
        ].join("\n") + "\0";

      if (activeSocket.readyState === WebSocket.OPEN) {
        activeSocket.send(connectFrame);
      }
    };

    activeSocket.onmessage = (event) => {
      const raw = typeof event.data === "string" ? event.data : "";
      if (!raw || raw === "\n" || raw === "\r\n") {
        return;
      }

      const frames = raw.split("\0");
      for (const frame of frames) {
        const trimmed = frame.trim();
        if (!trimmed) continue;

        const lines = trimmed.split("\n");
        const command = lines[0].trim();

        if (command === "CONNECTED") {
          onConnected?.();

          const subQueue =
            ["SUBSCRIBE", "id:sub-user-queue", "destination:/user/queue/notifications", "\n"].join(
              "\n",
            ) + "\0";

          if (activeSocket.readyState === WebSocket.OPEN) {
            activeSocket.send(subQueue);
          }

          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          heartbeatInterval = setInterval(() => {
            if (activeSocket.readyState === WebSocket.OPEN) {
              activeSocket.send("\n");
            }
          }, 10000);
        } else if (command === "MESSAGE") {
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
        } else if (command === "ERROR") {
          onError?.(new Error("Kết nối thông báo thời gian thực bị từ chối"));
        }
      }
    };

    activeSocket.onerror = () => {
      // Reconnect will be handled in onclose
    };

    activeSocket.onclose = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (socket === activeSocket) {
        socket = null;
      }
      if (!isClosedManually) {
        scheduleReconnect();
      }
    };
  }

  function scheduleReconnect() {
    if (isClosedManually || reconnectTimeout) return;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 15000);
    reconnectAttempts++;
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      void connect();
    }, delay);
  }

  void connect();

  return () => {
    isClosedManually = true;
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
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
