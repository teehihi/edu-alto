# ADR-006: JWT Access Token and Refresh Token Auth

## Status

Accepted

## Context

Frontend cần cơ chế auth phù hợp web app hiện đại. Backend cần kiểm soát session, revoke token và bảo vệ endpoint nhạy cảm.

## Decision

EduAlto dùng short-lived JWT access token và refresh token có thể revoke/rotate. Refresh token lưu server-side dạng hash. Password hash bằng thuật toán mạnh, OTP/reset token có TTL và lưu hash.

## Consequences

- API stateless hơn với access token.
- Vẫn revoke được phiên qua refresh token.
- Cần rate limiting cho auth endpoint và test security cho token/ownership.

