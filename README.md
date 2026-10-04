<div align="center">
  <img src="frontend/public/images/logo-with-text.png" alt="EduAlto" width="260" />

  <h1>EduAlto</h1>

  <p>
    Nền tảng học tập trực tuyến cho người dùng Việt Nam, được xây dựng theo kiến trúc modular monolith,
    ưu tiên correctness, security, maintainability và khả năng mở rộng theo từng vertical slice.
  </p>

  <p>
    <img alt="Java 25" src="https://img.shields.io/badge/Java-25%20LTS-20B486?style=for-the-badge" />
    <img alt="Spring Boot" src="https://img.shields.io/badge/Spring%20Boot-4.0.7-6DB33F?style=for-the-badge" />
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-101A2C?style=for-the-badge" />
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge" />
    <img alt="Redis" src="https://img.shields.io/badge/Redis-8.8.0-DC382D?style=for-the-badge" />
  </p>
</div>

---

## Tổng Quan

EduAlto là LMS foundation dành cho học viên, giảng viên và quản trị viên tại Việt Nam. Nền tảng được xây dựng theo kiến trúc modular monolith trên nền tảng backend Spring Boot 4 / Java 25 LTS kết hợp frontend Next.js 16 / React 19, bảo đảm tính an toàn bảo mật, trải nghiệm người dùng mượt mà và khả năng mở rộng theo từng vertical slice.

## Trạng Thái Hiện Tại

| Hạng mục | Trạng thái |
| --- | --- |
| Monorepo foundation | Hoàn thành |
| Java 25 LTS & Spring Boot 4.0.7 migration | Hoàn thành |
| Next.js 16 + React 19 + Turbopack | Hoàn thành |
| PostgreSQL 16 & Redis 8.8.0 local infrastructure | Hoàn thành |
| Testcontainers (PostgreSQL 16) integration testing | Hoàn thành |
| Flyway migration (V1–V17) | Hoàn thành |
| User + Authentication backend slice (HttpOnly cookie) | Hoàn thành |
| Profile & Cloudflare R2 presigned avatar slice | Hoàn thành |
| Course catalog & Course structure curriculum slice | Hoàn thành |
| Frontend UI (Landing, Explore, Course Detail, Profile, Auth Modal) | Hoàn thành |

## Tính Năng Đã Có

### Backend Authentication & User Management

- Đăng ký tài khoản, xác thực tài khoản qua email bằng mã OTP bảo mật.
- Gửi lại mã xác thực OTP có cơ chế giới hạn thời gian (rate limit/cooldown) và chống spam.
- Đăng nhập bằng email/password, cấp phát JWT Access Token và Refresh Token.
- Refresh Token dùng HttpOnly Cookie (`edualto.refresh`, Path=/api/v1/auth), SameSite mặc định `Lax`; môi trường cross-site dùng `None` và `Secure=true`.
- Hỗ trợ Refresh Token rotation và cơ chế revoke token triệt để khi logout.
- Quên mật khẩu, gửi OTP đặt lại mật khẩu và cập nhật mật khẩu mới an toàn.
- API thông tin người dùng hiện tại: `GET /api/v1/me`, `PUT /api/v1/me`.

### Backend Profile & Media Storage

- Quản lý hồ sơ cá nhân linh hoạt cho cả Học viên (`StudentProfile`) và Giảng viên (`InstructorProfile`).
- Tùy chỉnh thông tin chuyên môn: Headline, tiểu sử (bio), website, liên kết mạng xã hội (LinkedIn, GitHub, YouTube, Twitter).
- Tích hợp Cloudflare R2 / S3-compatible Storage: Cấp phát Presigned URL có thời hạn để client upload ảnh đại diện và tài liệu trực tiếp lên cloud storage an toàn mà không nghẽn băng thông backend.

### Backend Course & Curriculum Structure

- Danh mục khóa học (Course Catalog) hỗ trợ tìm kiếm full-text, lọc theo chuyên mục (Category), trạng thái công khai (PUBLISHED) và phân trang chuẩn REST.
- Xem chi tiết khóa học kèm đề cương bài giảng phân cấp theo Chương mục (`Section`) và Bài học (`Lesson`).
- Hỗ trợ bài học dạng Video (với Presigned URL stream bài học) và bài đọc/tài liệu đính kèm.

### Frontend Web Application

- Giao diện người dùng thiết kế chỉn chu theo Figma Design Tokens của EduAlto (Primary `#20B486`, Heading `#101A2C`, Muted `#667085`).
- Trang chủ (Landing Page) hiển thị nổi bật danh mục khóa học, tính năng cốt lõi và lộ trình phát triển.
- Trang Khám phá khóa học (Explore Courses) với sidebar lọc danh mục, thanh tìm kiếm động và grid card khóa học trực quan.
- Trang Chi tiết khóa học (Course Detail) với accordion giáo trình tương tác và modal xem thử video.
- Trang Hồ sơ cá nhân (Profile Page) hỗ trợ chuyển đổi vai trò học viên / giảng viên và tải lên ảnh đại diện.
- Modal xác thực Auth Modal với form đăng nhập, đăng ký và xác nhận mã OTP thân thiện với người dùng Việt Nam.

### Security Foundation

- Password mã hóa bằng thuật toán an toàn BCrypt.
- OTP lưu dạng băm (SHA-256), có TTL (thời gian sống), giới hạn số lần nhập sai (attempt limit) và chống tái sử dụng.
- Tài khoản mới tạo ở trạng thái `PENDING_VERIFICATION`, chỉ kích hoạt `ACTIVE` sau khi xác thực OTP thành công.
- Refresh token hash lưu trữ an toàn trong DB, không lưu token thô.
- Refresh token và OTP được khóa khi xử lý để chống tái sử dụng đồng thời; OTP được tiêu thụ cùng giao dịch đổi mật khẩu hoặc kích hoạt tài khoản.
- Cấu hình HttpOnly Cookie cho refresh token với `HttpOnly`, SameSite phù hợp và `Secure` trên môi trường production.
- Các endpoint credential/OTP có giới hạn request theo IP và trả `429` cùng `Retry-After` khi vượt giới hạn.
- Biến môi trường local phân tách trong `.env`, tuyệt đối không commit secrets lên repository.
- Xử lý lỗi toàn cục qua `@RestControllerAdvice`, che giấu stack trace và trả về mã lỗi chuẩn hóa cho client.

### Database Foundation

- Flyway migration `V1__auth_user_management.sql`: các bảng `users`, `roles`, `user_roles`, `email_otps`, `refresh_tokens`.
- Flyway migration `V2__create_user_profiles.sql`: các bảng `profiles`, `student_profiles`, `instructor_profiles`.
- V3–V17 bổ sung avatar, handle, khóa học, giáo trình, ghi danh, tiến độ, đánh giá, bài tập, quiz, lịch, ghi chú, thanh toán, khuyến mãi, tin nhắn và thông báo.
- PostgreSQL 16 runtime đã được verify với Flyway history, bảng thật, constraints, foreign keys và indexes.

## Tech Stack

| Layer | Công nghệ | Phiên bản |
| --- | --- | --- |
| Frontend Framework | Next.js (App Router, Turbopack) | 16.3.1 |
| Frontend Core | React & React DOM | 19.2.8 |
| Language | TypeScript | 5.9.3 |
| Styling | Tailwind CSS | 3.4.16 |
| Frontend Lint & Format | Oxlint & Oxfmt | 1.78.0 / 0.63.0 |
| Frontend Testing | Vitest & Testing Library | 4.1.10 / 16.3.2 |
| Backend Framework | Spring Boot | 4.0.7 |
| Java Runtime | Eclipse Temurin OpenJDK (LTS) | Java 25 |
| Backend Security | Spring Security | 7.0.x |
| Persistence & ORM | Spring Data JPA / Hibernate | 7.0.x |
| Cloud Storage SDK | AWS SDK for Java v2 (S3/Cloudflare R2) | 2.29.50 |
| Database | PostgreSQL | 16-alpine |
| Integration Testing DB | Testcontainers (PostgreSQL) | 2.0.5 |
| Cache & Realtime | Redis | 8.8.0 |
| Database Migration | Flyway | 11.x |
| DevOps & Container | Docker Compose, Backend Multi-stage Dockerfile | - |
| Frontend Deployment | Vercel (Dockerfile local được comment) | - |

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

Điền `POSTGRES_PASSWORD` và `JWT_SECRET` riêng trong `.env` trước khi chạy. JWT secret cần ít nhất 32 byte; có thể tạo bằng `openssl rand -base64 48`. Backend và Compose không dùng secret mặc định. `.env` không được commit.

### 2. Chạy PostgreSQL và Redis

```bash
docker compose up -d postgres redis
```

Kiểm tra trạng thái:

```bash
docker compose ps
```

### 3. Chạy backend trực tiếp (Host Machine)

Backend sử dụng Maven Wrapper (`./backend/mvnw`), không yêu cầu cài đặt Maven toàn cục. Khi database chạy trong Docker, backend kết nối qua `localhost`:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/edualto
export SPRING_DATASOURCE_USERNAME=edualto
export SPRING_DATASOURCE_PASSWORD=<your-local-postgres-password>
export SPRING_DATASOURCE_DRIVER=org.postgresql.Driver
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=<your-local-jwt-secret>

./backend/mvnw -f backend/pom.xml spring-boot:run
```

*Lưu ý: Bộ test tích hợp (Integration Tests) tự động khởi tạo Testcontainers (PostgreSQL 16) cô lập trong Docker, không phụ thuộc vào trạng thái database local.*

### 4. Chạy frontend (Next.js 16)

```bash
pnpm install
pnpm frontend:dev
```

Frontend chạy trên cổng **3002** (http://localhost:3002) và mặc định proxy/kết nối API backend tại:

```text
http://localhost:8080/api/v1
```

*(Frontend Dockerfile hiện được chú thích/vô hiệu hóa vì frontend được triển khai trực tiếp thông qua Vercel).*

### 5. Chạy backend bằng Docker Compose

Khi backend chạy trong Compose, service tự động kết nối qua mạng nội bộ tới `postgres` và `redis`:

```bash
docker compose up backend
```

## Kiểm Thử Và Build

### Backend

```bash
# Chạy toàn bộ integration tests thông qua Testcontainers PostgreSQL 16
./backend/mvnw -f backend/pom.xml test
# hoặc sử dụng script root:
pnpm backend:test

# Đóng gói ứng dụng JAR
./backend/mvnw -f backend/pom.xml package
# hoặc:
pnpm backend:build
```

### Frontend

```bash
# Kiểm tra lint cực nhanh với Oxlint (~19ms)
pnpm frontend:lint:fast

# Kiểm tra lint chi tiết với ESLint 9
pnpm frontend:lint

# Định dạng code với Oxfmt
pnpm frontend:fmt:check
pnpm frontend:fmt

# Kiểm tra kiểu dữ liệu TypeScript
pnpm frontend:typecheck

# Chạy Unit & Component tests với Vitest
pnpm --dir frontend test

# Build ứng dụng Next.js sản phẩm với Turbopack
pnpm frontend:build
```

## API Documentation

Khi backend chạy, OpenAPI UI (Swagger) sẵn sàng tại:

```text
http://localhost:8080/swagger-ui.html
```

API dùng tiền tố:

```text
/api/v1
```

### Các Endpoint Cốt Lõi Đã Triển Khai

#### 1. Authentication (`/api/v1/auth`)
```text
POST /api/v1/auth/register            # Đăng ký tài khoản mới
POST /api/v1/auth/verify-email        # Xác thực OTP email kích hoạt tài khoản
POST /api/v1/auth/resend-verification # Gửi lại OTP xác thực (có cooldown)
POST /api/v1/auth/login              # Đăng nhập, cấp Access Token & HttpOnly Cookie
POST /api/v1/auth/refresh            # Xoay vòng Refresh Token qua Cookie edualto.refresh
POST /api/v1/auth/logout             # Đăng xuất, revoke refresh token và xóa cookie
POST /api/v1/auth/forgot-password    # Yêu cầu OTP đặt lại mật khẩu
POST /api/v1/auth/verify-reset-otp   # Xác thực OTP đặt lại mật khẩu
POST /api/v1/auth/reset-password     # Xác nhận mật khẩu mới
```

#### 2. User & Profile (`/api/v1/me`, `/api/v1/me/profile`)
```text
GET  /api/v1/me                                # Lấy thông tin user hiện tại
PUT  /api/v1/me                                # Cập nhật thông tin cơ bản
GET  /api/v1/me/profile                        # Lấy hồ sơ cá nhân (Student / Instructor)
PUT  /api/v1/me/profile                        # Cập nhật thông tin hồ sơ
POST /api/v1/me/profile/avatar/upload-url      # Xin presigned URL upload avatar lên R2
POST /api/v1/me/profile/avatar/complete        # Xác nhận avatar đã upload
POST /api/v1/me/profile/avatar                 # Upload multipart tối đa 5 MB
GET  /api/v1/profiles/{identifier}             # Hồ sơ công khai, không trả email hoặc trạng thái tài khoản
```

#### 3. Media & Storage (`/api/v1/media`)
```text
GET /api/v1/media/{objectKey}                  # Phục vụ media công khai; video khóa học bị chặn
GET /api/v1/lessons/{lessonId}/video-access     # URL phát video có kiểm tra ghi danh
```

#### 4. Course & Curriculum (`/api/v1/courses`)
```text
GET  /api/v1/courses                                      # Tìm kiếm và phân trang khóa học
GET  /api/v1/courses/{slug}                               # Xem chi tiết khóa học
GET  /api/v1/courses/{slug}/curriculum                    # Lấy giáo trình công khai
GET  /api/v1/courses/{slug}/lessons/{lessonId}/preview     # Xem thử bài học văn bản
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
