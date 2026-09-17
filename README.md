# EduAlto

EduAlto là nền tảng học tập trực tuyến hướng tới người dùng Việt Nam. Dự án được thiết kế theo kiến trúc modular monolith để phát triển nhanh, dễ kiểm thử, dễ triển khai và vẫn giữ ranh giới module rõ ràng cho các phase mở rộng sau này.

## Trạng thái foundation

Repository ban đầu không phải Git checkout và gần như trống, chỉ có thư mục `Logo/` chứa tài sản nhận diện. Lần chạy foundation này thiết lập:

- Frontend Next.js + TypeScript + Tailwind CSS.
- Backend Java 25 LTS + Spring Boot + Maven.
- PostgreSQL và Redis qua Docker Compose.
- Cấu trúc test cho frontend/backend.
- Tài liệu kiến trúc, database, API, AI extension, Figma analysis và coding standards.
- Foundation cho security, WebSocket, validation, error handling và OpenAPI.

## Tech stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS.
- Backend: Java 25 LTS, Spring Boot, Spring Security, Spring WebSocket, Spring Data JPA, Spring Validation, springdoc-openapi.
- Database: PostgreSQL.
- Cache/realtime support: Redis.
- Testing: Vitest/Testing Library cho frontend, JUnit 5 + Spring Boot Test cho backend.
- DevOps: Dockerfile trong `frontend/` và `backend/`, Docker Compose cho local development.

## Kiến trúc

EduAlto sử dụng modular monolith. Các module chính gồm auth, user, course, enrollment, lesson, learning, quiz, assignment, document, discussion, messaging, notification, schedule, review, certificate, analytics, admin và ai.

Nguyên tắc phụ thuộc backend:

```text
controller -> application/service -> domain -> repository -> infrastructure
```

Controller không chứa business logic. Entity không được trả trực tiếp ra API khi dữ liệu cần DTO. AI là extension độc lập: core LMS vẫn hoạt động khi AI service chưa tồn tại.

## Cấu trúc dự án

```text
.
├── AGENTS.md
├── docs/
├── frontend/
│   └── Dockerfile
├── backend/
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Chạy local

Chạy hạ tầng PostgreSQL và Redis bằng Docker Compose:

```bash
cp .env.example .env
docker compose up -d postgres redis
```

Khi chạy backend trực tiếp trên macOS và muốn dùng PostgreSQL trong Docker, truyền datasource qua environment:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/edualto
export SPRING_DATASOURCE_USERNAME=edualto
export SPRING_DATASOURCE_PASSWORD=edualto_dev_password
export SPRING_DATASOURCE_DRIVER=org.postgresql.Driver
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=replace-with-local-development-secret
```

Sau đó chạy app:

```bash
pnpm install
pnpm frontend:dev
mvn -f backend/pom.xml spring-boot:run
```

Nếu chạy backend trong Docker Compose, service backend tự dùng hostname nội bộ `postgres` và `redis`.

```bash
docker compose up backend
```

Fallback H2 trong `application.yml` phục vụ test/dev nhanh khi không cấu hình datasource PostgreSQL.

## Kiểm thử và build

```bash
pnpm frontend:lint
pnpm frontend:typecheck
pnpm frontend:build
mvn -f backend/pom.xml test
mvn -f backend/pom.xml package
```

## API documentation

Khi backend chạy, OpenAPI UI dự kiến có tại:

```text
http://localhost:8080/swagger-ui.html
```

API dùng prefix `/api/v1`.

## Roadmap

1. Authentication + Authorization.
2. User + Profile.
3. Course + Category.
4. Enrollment.
5. Section + Lesson.
6. Learning Progress.
7. Quiz + Question + Attempt.
8. Assignment + Submission.
9. Document + Saved Document.
10. Discussion, Messaging, Notification.
11. Analytics.
12. AI Skill Analysis.
13. AI Recommendation.

## Tài liệu

- [System analysis](docs/architecture/system-analysis.md)
- [Architecture](docs/architecture/architecture.md)
- [Coding standards](docs/architecture/coding-standards.md)
- [AI extension](docs/architecture/ai-extension.md)
- [Database design](docs/database/database-design.md)
- [API design](docs/api/api-design.md)
- [Figma analysis](docs/ui/figma-analysis.md)
