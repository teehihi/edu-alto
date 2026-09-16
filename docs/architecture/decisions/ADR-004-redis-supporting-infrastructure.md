# ADR-004: Redis as Supporting Infrastructure

## Status

Accepted

## Context

EduAlto cần cache, rate limit, OTP TTL và hỗ trợ realtime scale. Những dữ liệu này có thể tái tạo hoặc có vòng đời ngắn, không nên làm phức tạp PostgreSQL.

## Decision

Redis được dùng cho cache ngắn hạn, OTP/rate limit/presence/idempotency và WebSocket relay khi scale. Redis không phải nguồn dữ liệu chính.

## Consequences

- Hệ thống có thể tăng hiệu năng và kiểm soát abuse tốt hơn.
- Khi Redis lỗi, core LMS phải degrade hợp lý dựa trên PostgreSQL.
- Không lưu secrets/plaintext OTP/token trong Redis.

