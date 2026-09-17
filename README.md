<div align="center">
  <img src="frontend/public/images/logo-with-text.png" alt="EduAlto" width="260" />

  <h1>EduAlto</h1>

  <p>
    Nền tảng học tập trực tuyến cho người dùng Việt Nam, được xây dựng theo kiến trúc modular monolith,
    ưu tiên correctness, security, maintainability và khả năng mở rộng theo từng vertical slice.
  </p>

  <p>
    <img alt="Java 25" src="https://img.shields.io/badge/Java-25%20LTS-20B486?style=for-the-badge" />
    <img alt="Spring Boot" src="https://img.shields.io/badge/Spring%20Boot-3.5.16-6DB33F?style=for-the-badge" />
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-101A2C?style=for-the-badge" />
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge" />
    <img alt="Redis" src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge" />
  </p>
</div>

---

## Tổng Quan

EduAlto là LMS foundation dành cho học viên, giảng viên và quản trị viên. Dự án hiện tập trung vào một lõi backend chắc chắn: xác thực, quản lý người dùng, database migration và hạ tầng local bằng Docker Compose.

Sản phẩm được thiết kế để phát triển theo từng module rõ ràng thay vì tách microservices quá sớm. Các feature như khóa học, ghi danh, bài học, quiz, assignment, notification và AI recommendation sẽ được bổ sung theo các run tiếp theo.

## Trạng Thái Hiện Tại

| Hạng mục | Trạng thái |
| --- | --- |
| Monorepo foundation | Hoàn thành |
| Java 25 LTS migration | Hoàn thành |
| Dockerfile organization | Hoàn thành |
| Architecture/database/security/API docs | Hoàn thành foundation |
| PostgreSQL + Redis local infrastructure | Hoàn thành |
| Flyway migration V1 | Hoàn thành |
| User + Authentication backend slice | Hoàn thành |
| Frontend auth UI | Chưa triển khai |
| Course/Learning modules | Chưa triển khai |

## Tính Năng Đã Có

### Backend Authentication

- Đăng ký tài khoản.
- Xác thực email bằng OTP.
- Gửi lại OTP xác thực.
- Đăng nhập bằng email/password.
- JWT access token.
- Refresh token lưu dạng hash, có rotation/revoke.
- Đăng xuất bằng refresh token revoke.
- Quên mật khẩu, xác thực OTP reset, đặt mật khẩu mới.
- API người dùng hiện tại: `GET /api/v1/me`, `PUT /api/v1/me`.

### Security Foundation

- Password hash bằng BCrypt.
- OTP lưu dạng hash, có TTL, attempt limit và chống reuse.
- Account mới ở trạng thái `PENDING_VERIFICATION`.
- Chỉ account `ACTIVE` được login.
- Refresh token không lưu raw token trong database.
- Secret local nằm trong `.env`, không commit lên Git.
- Error response nhất quán, không expose stack trace cho frontend.

### Database Foundation

Flyway migration `V1__auth_user_management.sql` tạo các bảng:

- `users`
- `roles`
- `user_roles`
- `email_otps`
- `refresh_tokens`

PostgreSQL runtime đã được verify với Flyway history, bảng thật, constraints và indexes.

## Tech Stack

| Layer | Công nghệ |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS |
| Backend | Java 25 LTS, Spring Boot 3.5.16, Spring Security, Spring Data JPA |
| API | REST, OpenAPI, JSON DTO |
| Database | PostgreSQL 16 |
| Cache/realtime support | Redis 7 |
| Migration | Flyway |
| Testing | Vitest, Testing Library, JUnit 5, Spring Boot Test |
| DevOps | Docker Compose, Dockerfile riêng cho backend/frontend |

## Kiến Trúc

EduAlto dùng modular monolith. Backend giữ dependency direction:

```text
controller -> service/application -> domain -> repository -> infrastructure
```

Các module chính:

```text
auth, user, profile, instructor, course, enrollment, lesson, learning,
quiz, assignment, document, discussion, messaging, notification,
schedule, review, certificate, analytics, admin, ai
```

Nguyên tắc quan trọng:

- Controller chỉ nhận request, validate và gọi service.
- Service xử lý use case.
- Domain giữ entity/value object/rule cốt lõi.
- Repository chỉ truy cập persistence.
- DTO không lẫn entity.
- Không tạo abstraction chung nếu chưa có nhu cầu thật.
- AI là extension tương lai, không nhúng cứng vào core LMS.

## Cấu Trúc Dự Án

```text
.
├── AGENTS.md
├── README.md
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── database/
│   ├── security/
│   └── testing/
└── Logo/
```

## Chạy Local

### 1. Tạo file môi trường

```bash
cp .env.example .env
```

Với môi trường local hiện tại, `.env` không được commit. Hãy dùng secret riêng cho máy của bạn.

### 2. Chạy PostgreSQL và Redis

```bash
docker compose up -d postgres redis
```

Kiểm tra trạng thái:

```bash
docker compose ps
```

### 3. Chạy backend trực tiếp trên macOS

Khi backend chạy ngoài Docker nhưng database chạy trong Docker, dùng `localhost`:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/edualto
export SPRING_DATASOURCE_USERNAME=edualto
export SPRING_DATASOURCE_PASSWORD=<your-local-postgres-password>
export SPRING_DATASOURCE_DRIVER=org.postgresql.Driver
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=<your-local-jwt-secret>

mvn -f backend/pom.xml spring-boot:run
```

Nếu không cấu hình datasource PostgreSQL, backend fallback sang H2 để phục vụ test/dev nhanh.

### 4. Chạy frontend

```bash
pnpm install
pnpm --dir frontend dev
```

Frontend mặc định gọi API qua:

```text
http://localhost:8080/api/v1
```

### 5. Chạy backend bằng Docker Compose

Khi backend chạy trong Compose, service tự dùng hostname nội bộ `postgres` và `redis`:

```bash
docker compose up backend
```

## Kiểm Thử Và Build

Backend:

```bash
mvn -f backend/pom.xml test
mvn -f backend/pom.xml package
```

Frontend:

```bash
CI=true pnpm --dir frontend typecheck
CI=true pnpm --dir frontend lint
CI=true pnpm --dir frontend test
CI=true pnpm --dir frontend build
```

Docker Compose:

```bash
docker compose config
```

## API Documentation

Khi backend chạy, OpenAPI UI có tại:

```text
http://localhost:8080/swagger-ui.html
```

API dùng prefix:

```text
/api/v1
```

Một số endpoint auth đã có:

```text
POST /api/v1/auth/register
POST /api/v1/auth/verify-email
POST /api/v1/auth/resend-verification
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/verify-reset-otp
POST /api/v1/auth/reset-password
GET  /api/v1/me
PUT  /api/v1/me
```

## Tài Liệu Chính

| Tài liệu | Nội dung |
| --- | --- |
| [Architecture](docs/architecture/architecture.md) | Kiến trúc tổng thể |
| [Module boundaries](docs/architecture/module-boundaries.md) | Ranh giới module backend |
| [Database design](docs/database/database-design.md) | Thiết kế database |
| [API design](docs/api/api-design.md) | Quy ước API |
| [Security](docs/security/authentication-authorization.md) | Xác thực và phân quyền |
| [Testing strategy](docs/testing/testing-strategy.md) | Chiến lược kiểm thử |
| [Figma analysis](docs/ui/figma-analysis.md) | Phân tích UI/Figma |
| [AI extension](docs/architecture/ai-extension.md) | Hướng mở rộng AI |

## Roadmap

1. Authentication + User Management.
2. Profile module.
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

## Quy Ước Đóng Góp

- UI copy, validation message và user-facing message dùng tiếng Việt.
- Source code, class, function, API path và database naming dùng tiếng Anh.
- Không commit `.env`, secrets, build artifacts, `node_modules`, `target`.
- Không đổi modular monolith sang microservices trong foundation.
- Không merge code nếu làm vỡ lint, typecheck, build hoặc test.

---

<div align="center">
  <strong>EduAlto</strong><br />
  LMS foundation gọn gàng, an toàn và đủ chắc để phát triển từng module.
</div>
