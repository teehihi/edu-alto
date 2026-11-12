import { apiRequest } from "@/lib/api";
import {
  fetchWsTicket,
  resolveWsUrl,
  type WsTicketResponse,
} from "@/lib/realtime-notification-client";

export type RealtimeMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type RealtimeMessageEvent = {
  type: "MESSAGE_CREATED" | string;
  conversationId: string;
  data: RealtimeMessage;
  occurredAt: string;
};

export type RealtimePresenceEvent = {
  type: "PRESENCE_UPDATED" | string;
  userId: string;
  online: boolean;
  occurredAt: string;
};

export type PresenceStatus = {
  userId: string;
  online: boolean;
};

export function fetchUserPresence(
  userIds: string[],
  accessToken: string,
): Promise<PresenceStatus[]> {
  if (userIds.length === 0) {
    return Promise.resolve([]);
  }
  const params = new URLSearchParams();
  for (const id of userIds) {
    params.append("userIds", id);
  }
  return apiRequest<PresenceStatus[]>(`/me/presence?${params.toString()}`, { accessToken });
}

export function connectRealtimeMessaging(options: {
  getAccessToken?: () => Promise<string | null>;
  token?: string;
  onMessage: (event: RealtimeMessageEvent) => void;
  onPresence?: (event: RealtimePresenceEvent) => void;
  onConnected?: () => void;
  onError?: (err: Error) => void;
}): () => void {
  const { getAccessToken, token, onMessage, onPresence, onConnected, onError } = options;
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
        onError?.(new Error("Không có phiên đăng nhập hợp lệ để kết nối tin nhắn"));
        scheduleReconnect();
        return;
      }
      ticketResponse = await fetchWsTicket(accessToken);
      if (isClosedManually) return;
      socket = new WebSocket(resolveWsUrl(ticketResponse.ticket));
    } catch (err) {
      if (isClosedManually) return;
      onError?.(err instanceof Error ? err : new Error("Không thể khởi tạo kết nối tin nhắn"));
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

          const subMessages =
            ["SUBSCRIBE", "id:sub-user-messages", "destination:/user/queue/messages", "\n"].join(
              "\n",
            ) + "\0";
          const subPresence =
            ["SUBSCRIBE", "id:sub-user-presence", "destination:/user/queue/presence", "\n"].join(
              "\n",
            ) + "\0";

          if (activeSocket.readyState === WebSocket.OPEN) {
            activeSocket.send(subMessages);
            activeSocket.send(subPresence);
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
          if (emptyLineIndex === -1) continue;

          const headers = lines.slice(1, emptyLineIndex);
          const destinationHeader = headers.find((h) => h.startsWith("destination:")) ?? "";
          const body = lines
            .slice(emptyLineIndex + 1)
            .join("\n")
            .trim();

          try {
            const parsed = JSON.parse(body) as unknown;
            if (isRealtimePresenceEvent(parsed, destinationHeader)) {
              onPresence?.(parsed);
            } else if (isRealtimeMessageEvent(parsed)) {
              onMessage(parsed);
            }
          } catch {
            // Ignore non-json payload
          }
        } else if (command === "ERROR") {
          onError?.(new Error("Kết nối tin nhắn thời gian thực bị từ chối"));
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

function isRealtimeMessageEvent(payload: unknown): payload is RealtimeMessageEvent {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.type === "string" &&
    typeof candidate.conversationId === "string" &&
    candidate.data !== null &&
    typeof candidate.data === "object"
  );
}

function isRealtimePresenceEvent(
  payload: unknown,
  destinationHeader: string,
): payload is RealtimePresenceEvent {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Record<string, unknown>;
  if (destinationHeader.includes("/queue/presence")) {
    return typeof candidate.userId === "string" && typeof candidate.online === "boolean";
  }
  return (
    candidate.type === "PRESENCE_UPDATED" &&
    typeof candidate.userId === "string" &&
    typeof candidate.online === "boolean"
  );
}
