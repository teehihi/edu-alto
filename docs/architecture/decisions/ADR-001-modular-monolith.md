# ADR-001: Modular Monolith

## Status

Accepted

## Context

EduAlto là LMS cho đồ án/phase foundation, cần phát triển nhanh, dễ test, dễ chạy local và vẫn giữ module boundary rõ ràng. Microservices tạo thêm chi phí deploy, observability, distributed transaction và network failure không cần thiết ở giai đoạn này.

## Decision

EduAlto dùng modular monolith với Spring Boot backend. Dependency direction:

```text
controller -> service/application -> domain -> repository -> infrastructure
```

Các module chính gồm `auth`, `user`, `profile`, `instructor`, `course`, `enrollment`, `lesson`, `learning`, `quiz`, `assignment`, `document`, `discussion`, `messaging`, `notification`, `schedule`, `review`, `certificate`, `analytics`, `admin`, `ai`.

## Consequences

- Development và local testing đơn giản hơn.
- PostgreSQL transaction rõ ràng hơn.
- Module boundary phải được review nghiêm túc để tránh monolith bị rối.
- Tương lai vẫn có thể tách module thành service riêng nếu có nhu cầu thật.

