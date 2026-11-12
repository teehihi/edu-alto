import {
  connectRealtimeNotifications,
  fetchWsTicket,
  resolveWsUrl,
} from "./realtime-notification-client";
import { connectRealtimeMessaging } from "./realtime-messaging-client";

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = MockWebSocket.OPEN;
  sentFrames: string[] = [];
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentFrames.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
  }

  emitOpen() {
    this.onopen?.(new Event("open"));
  }

  emitMessage(data: string) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }
}

describe("realtime websocket clients", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchanges access token for a single-use ws ticket and never puts JWT in URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { ticket: "ws-ticket-123", expiresInSeconds: 30 },
          meta: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const ticketResponse = await fetchWsTicket("jwt-secret-token");
    expect(ticketResponse).toEqual({ ticket: "ws-ticket-123", expiresInSeconds: 30 });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/ws\/ticket$/),
      expect.objectContaining({
        method: "POST",
      }),
    );

    const wsUrl = resolveWsUrl(ticketResponse.ticket);
    expect(wsUrl).toContain("?ticket=ws-ticket-123");
    expect(wsUrl).not.toContain("token=");
    expect(wsUrl).not.toContain("jwt-secret-token");
  });

  it("connectRealtimeNotifications uses ticket URL and subscribes only to /user/queue/notifications", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { ticket: "notif-ticket-1", expiresInSeconds: 30 },
          meta: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const received: string[] = [];
    const onConnected = vi.fn();

    const disconnect = connectRealtimeNotifications({
      getAccessToken: async () => "jwt-access-token",
      userId: "user-123",
      onNotification: (n) => received.push(n.id),
      onConnected,
    });

    await vi.waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain("?ticket=notif-ticket-1");
    expect(ws.url).not.toContain("jwt-access-token");

    ws.emitOpen();
    expect(ws.sentFrames[0]).toContain("CONNECT");
    expect(ws.sentFrames[0]).toContain("Authorization:Bearer jwt-access-token");

    ws.emitMessage("CONNECTED\nversion:1.2\n\n\0");
    expect(onConnected).toHaveBeenCalledTimes(1);

    const subscribeFrames = ws.sentFrames.slice(1);
    expect(subscribeFrames).toHaveLength(1);
    expect(subscribeFrames[0]).toContain("destination:/user/queue/notifications");
    expect(subscribeFrames[0]).not.toContain("/topic/notifications/");

    ws.emitMessage(
      'MESSAGE\ndestination:/user/queue/notifications\n\n{"id":"notif-1","recipientId":"user-123","type":"SYSTEM","title":"Xin chào","message":"Nội dung","linkUrl":null,"readAt":null,"createdAt":"2026-11-12T00:00:00Z"}\0',
    );
    expect(received).toEqual(["notif-1"]);

    disconnect();
    expect(ws.sentFrames.at(-1)).toBe("DISCONNECT\n\n\0");
  });

  it("connectRealtimeMessaging subscribes to /user/queue/messages and /user/queue/presence", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { ticket: "msg-ticket-1", expiresInSeconds: 30 },
          meta: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const messages: string[] = [];
    const presences: boolean[] = [];

    const disconnect = connectRealtimeMessaging({
      getAccessToken: async () => "jwt-msg-token",
      onMessage: (event) => messages.push(event.data.body),
      onPresence: (event) => presences.push(event.online),
    });

    await vi.waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toContain("?ticket=msg-ticket-1");
    expect(ws.url).not.toContain("jwt-msg-token");

    ws.emitOpen();
    ws.emitMessage("CONNECTED\nversion:1.2\n\n\0");

    expect(ws.sentFrames.some((f) => f.includes("destination:/user/queue/messages"))).toBe(true);
    expect(ws.sentFrames.some((f) => f.includes("destination:/user/queue/presence"))).toBe(true);

    ws.emitMessage(
      'MESSAGE\ndestination:/user/queue/messages\n\n{"type":"MESSAGE_CREATED","conversationId":"conv-1","data":{"id":"m-1","senderId":"u-1","body":"Chào bạn","createdAt":"2026-11-12T00:00:00Z","readAt":null},"occurredAt":"2026-11-12T00:00:00Z"}\0',
    );
    ws.emitMessage(
      'MESSAGE\ndestination:/user/queue/presence\n\n{"type":"PRESENCE_UPDATED","userId":"u-1","online":true,"occurredAt":"2026-11-12T00:00:00Z"}\0',
    );

    expect(messages).toEqual(["Chào bạn"]);
    expect(presences).toEqual([true]);

    disconnect();
  });
});
