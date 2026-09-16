# ADR-002: REST API Contract

## Status

Accepted

## Context

Frontend Next.js cần contract ổn định để gọi backend Spring Boot. EduAlto có nhiều module CRUD/use case, phù hợp REST hơn GraphQL trong foundation.

## Decision

API dùng REST JSON với prefix `/api/v1`. Response format thống nhất:

- Success: `{ "success": true, "data": ..., "meta": ... }`
- Error: `{ "success": false, "error": { "code": "...", "message": "...", "details": [] }, "timestamp": "...", "path": "..." }`

OpenAPI phải phản ánh endpoint thật. Pagination dùng `page`, `size`, `sort`; search dùng `q`.

## Consequences

- Frontend dễ xử lý lỗi và loading/empty state.
- API dễ document và test bằng controller test.
- Thay đổi contract cần cập nhật docs, OpenAPI và test liên quan.

