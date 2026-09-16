# ADR-007: Testing and Quality Gates

## Status

Accepted

## Context

EduAlto có frontend, backend, security và database rules. Foundation cần quy tắc test rõ để tránh phá contract/API/authorization khi module lớn dần.

## Decision

Áp dụng test pyramid:

- Frontend: Vitest và Testing Library.
- Backend: JUnit 5, Spring Boot Test, controller/service/repository test theo rủi ro.
- Integration: PostgreSQL/Redis/WebSocket khi cần.

Không merge code làm vỡ lint/typecheck/build/test.

## Consequences

- Behavior quan trọng được bảo vệ sớm.
- Controller test giữ API error format ổn định.
- Test scope tăng theo rủi ro và blast radius, không tạo test hình thức.

