# WebSocket Strategy

EduAlto dùng WebSocket/STOMP cho luồng realtime có giá trị rõ ràng: messaging, notification và trạng thái presence. REST API vẫn là kênh chính cho CRUD, query, submit quiz/assignment và quản trị.

## Transport

- Endpoint: `/ws`
- Protocol: STOMP over WebSocket.
- Auth: JWT trong connect header hoặc cơ chế được Spring Security hỗ trợ.
- Fallback: frontend phải có REST polling nhẹ cho notification nếu WebSocket không khả dụng.

## Destinations

```text
SEND      /app/conversations/{conversationId}/messages
SUBSCRIBE /topic/conversations/{conversationId}
SUBSCRIBE /user/queue/notifications
SUBSCRIBE /user/queue/presence
```

Không dùng broadcast public cho dữ liệu private. Message riêng tư phải đi qua user queue hoặc topic đã kiểm tra membership.

## Authorization

- `CONNECT`: token hợp lệ, user `ACTIVE`.
- `SEND /app/conversations/{conversationId}/messages`: user là participant của conversation.
- `SUBSCRIBE /topic/conversations/{conversationId}`: user là participant của conversation.
- `/user/queue/notifications`: chỉ user hiện tại nhận được.
- Admin không tự động được đọc tin nhắn riêng nếu không có use case audit được phê duyệt.

## Message lifecycle

1. Client gửi message qua STOMP.
2. Backend validate payload, quyền participant và conversation status.
3. Message được persist trong PostgreSQL.
4. Backend trả message DTO qua topic/user queue.
5. Notification được tạo cho người nhận offline hoặc chưa đọc.

Persist trước broadcast để client reconnect vẫn có thể đồng bộ qua REST.

## Payload conventions

```json
{
  "type": "MESSAGE_CREATED",
  "data": {},
  "occurredAt": "2026-09-16T00:00:00Z"
}
```

`type` dùng English uppercase. Nội dung hiển thị trong `data` nếu có user-facing text phải là tiếng Việt.

## Scaling

- Single instance: in-memory broker đủ cho foundation.
- Multi-instance: dùng Redis Pub/Sub hoặc broker relay.
- Message ordering bảo đảm ở mức conversation bằng `created_at` và sequence/UUID, không dựa hoàn toàn vào thời điểm client nhận.

## Reconnect

- Client tự reconnect với backoff.
- Sau reconnect, client gọi REST `GET /api/v1/conversations/{conversationId}/messages` để bù message bị lỡ.
- Notification badge đồng bộ lại bằng `GET /api/v1/me/notifications`.

## Security and abuse control

- Giới hạn kích thước payload.
- Rate limit message send theo user/conversation.
- Không gửi stack trace qua WebSocket error frame.
- Không tin vào `senderId` từ client; backend lấy user từ authentication principal.

