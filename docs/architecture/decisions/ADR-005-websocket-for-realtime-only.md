# ADR-005: WebSocket for Realtime Only

## Status

Accepted

## Context

EduAlto có nhu cầu realtime cho messaging và notification, nhưng phần lớn use case LMS là request/response bình thường. Dùng WebSocket cho mọi thứ sẽ tăng phức tạp không cần thiết.

## Decision

WebSocket/STOMP chỉ dùng cho messaging, notification và presence. REST vẫn là kênh chính cho CRUD, query, submit quiz/assignment và đồng bộ sau reconnect.

## Consequences

- Realtime có boundary rõ ràng.
- Message phải persist trước khi broadcast.
- Authorization WebSocket phải kiểm tra participant/resource ownership như REST.

